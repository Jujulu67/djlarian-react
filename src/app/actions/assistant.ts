'use server';

/**
 * Assistant IA de Gestion de Projet
 *
 * SÉCURITÉ EN PRODUCTION :
 * - ✅ Utilise uniquement Prisma directement (PAS d'appels API)
 * - ✅ Aucun accès aux APIs admin (/api/admin/*)
 * - ✅ Respecte les permissions de l'utilisateur connecté (session)
 * - ✅ Les utilisateurs USER ne peuvent accéder qu'à leurs propres projets
 * - ✅ Seuls les ADMIN peuvent accéder aux projets d'autres utilisateurs
 * - ✅ Toutes les requêtes Prisma sont filtrées par userId pour garantir l'isolation des données
 *
 * L'assistant n'a accès qu'aux fonctions publiques que l'utilisateur connecté possède déjà.
 * Il ne peut pas contourner les permissions en appelant des APIs admin.
 */

import { generateText } from 'ai';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { groq } from '@/lib/assistant/config';
import { createGetTargetUserId } from '@/lib/assistant/security/user-permissions';
import { createGetProjectsTool } from '@/lib/assistant/tools/get-projects-tool';
import { createUpdateProjectsTool } from '@/lib/assistant/tools/update-projects-tool';
import { createCreateProjectsTool } from '@/lib/assistant/tools/create-projects-tool';

// ... (imports remain the same)

// ... (rest of logic)

// ========================================
import { detectProgressFromQuery } from '@/lib/assistant/parsers/progress-detector';
import { detectDeadlineFromQuery } from '@/lib/assistant/parsers/deadline-detector';
import { classifyQuery } from '@/lib/assistant/query-parser/classifier';
import { debugLog, truncate } from '@/lib/assistant/utils/debug-logger';
import { detectFilters } from '@/lib/assistant/query-parser/filters';
import {
  getConversationContext,
  updateConversationContext,
  detectContextReference,
  resolveContextReference,
} from '@/lib/assistant/conversational/conversation-memory';
import { extractUpdateData } from '@/lib/assistant/query-parser/updates';

import { SYSTEM_PROMPT_8B } from '@/lib/assistant/prompts/system-prompt-8b';

export async function processProjectCommand(userInput: string) {
  // Vérifier l'authentification
  const session = await auth();
  if (!session?.user?.id) {
    return "Erreur : Vous devez être connecté pour utiliser l'assistant.";
  }

  const currentUserId = session.user.id;
  const currentUserName = session.user.name || null; // Nom de l'utilisateur connecté (ex: "Larian67")
  const currentUserRole = session.user.role || 'USER'; // Rôle de l'utilisateur connecté
  const isAdmin = currentUserRole === 'ADMIN'; // Vérifier si l'utilisateur est admin
  const today = new Date().toISOString().split('T')[0];

  // Désactivation de la normalisation IA - elle modifie trop la requête et ne corrige pas bien les statuts
  // On se fie uniquement à detectStatusFromQuery qui est plus robuste
  const normalizedInput = userInput;

  // Créer la fonction getTargetUserId avec les permissions
  const getTargetUserId = createGetTargetUserId({
    currentUserId,
    currentUserName,
    isAdmin,
  });

  // Mode test : détecté via variable d'environnement
  const isTestMode = process.env.ASSISTANT_TEST_MODE === 'true';

  // Créer les outils IA
  const getProjects = createGetProjectsTool({
    getTargetUserId,
    normalizedInput,
    isTestMode,
  });

  const updateProjects = createUpdateProjectsTool({
    getTargetUserId,
    normalizedInput,
    isTestMode,
  });

  const createProjects = createCreateProjectsTool({
    getTargetUserId,
    normalizedInput,
    isTestMode,
  });

  // Détecter le type de requête (question vs commande) avant l'appel à l'IA
  const lowerQuery = normalizedInput.toLowerCase();
  let { filters, fieldsToShow: detectedFieldsToShow } = detectFilters(
    normalizedInput,
    lowerQuery,
    [],
    []
  ); // Pas de collabs/styles nécessaires ici

  // ========================================
  // MÉMOIRE CONVERSATIONNELLE
  // ========================================
  // Détecter si la requête fait référence au contexte précédent
  const { hasContextReference, referenceType } = detectContextReference(normalizedInput);
  // Vérifier aussi si c'est une demande de détails (même sans référence explicite)
  const isDetailsRequest =
    /(?:avec|donne|donnes?|donner?|montre|montres?|montrer?|affiche|affiches?|afficher?)\s+(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)/i.test(
      lowerQuery
    ) ||
    /^(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)(?:\s+sur)?\s*$/i.test(
      lowerQuery.trim()
    );

  let contextResolutionMessage: string | undefined;

  if (hasContextReference || isDetailsRequest) {
    // Récupérer le contexte de conversation (projets précédemment listés, etc.)
    const resolution = await resolveContextReference(currentUserId, normalizedInput);

    console.warn('[Assistant] 🧠 Mémoire/Contexte récupéré:', {
      hasContext: resolution.resolved,
      filters: resolution.filters,
      message: resolution.message,
      lastProjectCount: resolution.projectIds?.length || 0, // Use projectIds as in original code
    });

    if (resolution.resolved) {
      // Condition corrected to check if resolved
      // Fusionner les filtres du contexte avec les filtres actuels
      filters = { ...resolution.filters, ...filters };
      contextResolutionMessage = resolution.message;
      console.warn('[Assistant] Contexte résolu:', {
        referenceType,
        projectCount: resolution.projectIds.length,
        appliedFilters: Object.keys(filters),
      });
    } else if (resolution.message) {
      // Pas de contexte disponible, retourner un message explicatif
      return resolution.message;
    }
  }

  // ========================================
  // CLASSIFICATION ET ROUTING
  // ========================================
  const classification = classifyQuery(normalizedInput, lowerQuery, filters);

  // Debug: Classification result
  debugLog('assistant.ts:classification', 'Classification détectée', {
    userInput: truncate(normalizedInput),
    filters: Object.keys(filters),
    classification: {
      isList: classification.isList,
      isCount: classification.isCount,
      isUpdate: classification.isUpdate,
      isConversationalQuestion: classification.isConversationalQuestion,
      understood: classification.understood,
    },
  });

  // Log console pour debug
  console.warn('[ROUTING DEBUG]', {
    query: normalizedInput.substring(0, 50),
    isUpdate: classification.isUpdate,
    isList: classification.isList,
    isCount: classification.isCount,
    hasFilters: Object.keys(filters).length > 0,
    isConversational: classification.isConversationalQuestion,
    memoryResolved: hasContextReference || isDetailsRequest ? 'YES' : 'NO',
  });

  // ========================================
  // EXECUTION DIRECTE (PARSER-FIRST)
  // ========================================
  // Si ce n'est PAS conversationnel, on tente l'exécution directe
  // Cela évite d'appeler Groq pour des commandes simples
  // AUSSI: Si on a une référence contextuelle ET que c'est une demande de détails/liste, traiter comme liste
  // OU si c'est une demande de détails (même sans référence explicite détectée, mais avec contexte disponible)
  const isContextualListRequest =
    (hasContextReference || isDetailsRequest) && (classification.isList || isDetailsRequest);

  if (!classification.isConversationalQuestion || isContextualListRequest) {
    // CAS 1: LISTE / COMPTAGE
    if (
      classification.isList ||
      classification.isCount ||
      (hasContextReference && !classification.isUpdate) ||
      isContextualListRequest
    ) {
      console.warn('[Assistant] 🚀 Exécution DIRECTE (LISTE/COMPTAGE)');

      const params = {
        ...filters,
        // Si c'est un comptage explicite, on peut le signaler, mais getProjects renvoie toujours le count
      };

      try {
        if (getProjects && typeof getProjects.execute === 'function') {
          // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
          const result = await getProjects.execute(params, {});
          const typedResult = result as {
            count?: number;
            projects?: Array<{ id: string; name: string }>;
            message?: string;
          };

          if (typedResult && typeof typedResult === 'object' && 'count' in typedResult) {
            // Sauvegarder le contexte
            updateConversationContext(currentUserId, {
              lastProjectIds: (typedResult.projects || []).map((p) => p.id),
              lastProjectNames: (typedResult.projects || []).map((p) => p.name || ''),
              lastProjectCount: typedResult.count,
              lastFilters: params,
              lastActionType: 'list',
              lastStatusFilter:
                params.status && typeof params.status === 'string' ? params.status : null,
            });

            if (typedResult.count === 0) {
              return typedResult.message || "Je n'ai trouvé aucun projet correspondant.";
            }

            if (classification.isCount && !classification.isList) {
              return typedResult.message || `Vous avez ${typedResult.count} projet(s).`;
            }

            // Retourner les données structurées pour l'affichage en tableau
            const projects = typedResult.projects || [];
            const message = typedResult.message || `J'ai trouvé ${typedResult.count} projet(s).`;

            // Déterminer les champs à afficher
            // IMPORTANT: Toujours re-détecter depuis la requête originale pour capturer "tous les détails"
            // même si on a un contexte (le contexte ne doit pas affecter les champs à afficher)
            const { fieldsToShow: reDetectedFields } = detectFilters(
              normalizedInput,
              lowerQuery,
              [],
              []
            );
            let fieldsToShow: string[] = [];

            if (reDetectedFields && reDetectedFields.length > 0) {
              // Si des champs ont été explicitement demandés (ex: "tous les détails"), les utiliser
              fieldsToShow = reDetectedFields;
              console.warn('[Assistant] Champs à afficher détectés depuis requête:', fieldsToShow);
            } else {
              // Sinon, utiliser les champs par défaut + ceux filtrés
              fieldsToShow = ['progress', 'status', 'deadline'];

              // Ajouter les champs supplémentaires si filtrés
              if (filters.collab && !fieldsToShow.includes('collab')) fieldsToShow.push('collab');
              if (filters.style && !fieldsToShow.includes('style')) fieldsToShow.push('style');
              if (filters.releaseDate && !fieldsToShow.includes('releaseDate'))
                fieldsToShow.push('releaseDate');
              console.warn('[Assistant] Champs par défaut utilisés:', fieldsToShow);
            }

            return JSON.stringify({
              message,
              data: {
                projects,
                type: 'list' as const,
                fieldsToShow,
              },
            });
          }
        }
      } catch (error) {
        console.error('[Assistant] Erreur exécution directe (List):', error);
      }
    }

    // CAS 2: MISE À JOUR (UPDATE)
    if (classification.isUpdate) {
      console.warn('[Assistant] 🚀 Exécution DIRECTE (UPDATE)');

      // Extraction des paramètres de mise à jour via updates.ts
      const availableStyles = ['Techno', 'House', 'DNB', 'Dubstep', 'Trance'];

      const updateParams = extractUpdateData(normalizedInput, lowerQuery, filters, availableStyles);

      if (updateParams) {
        const validUpdateParams = {
          ...filters,
          ...updateParams,
          newDeadline: updateParams.newDeadline || undefined,
        };

        try {
          if (updateProjects && typeof updateProjects.execute === 'function') {
            // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
            const result = await updateProjects.execute(validUpdateParams, {});
            const typedResult = result as { count?: number; message?: string };

            if (typedResult && typeof typedResult === 'object') {
              revalidatePath('/projects');

              if (typedResult.count !== undefined && typedResult.count > 0) {
                updateConversationContext(currentUserId, {
                  lastActionType: 'update',
                  lastActionTimestamp: Date.now(),
                });
              }

              return (
                typedResult.message || `Mise à jour effectuée sur ${typedResult.count} projet(s).`
              );
            }
          }
        } catch (error) {
          console.error('[Assistant] Erreur exécution directe (Update):', error);
        }
      } else {
        console.warn('[Assistant] Update détecté mais pas de paramètres extraits');
      }
    }

    // CAS 3: CRÉATION (CREATE)
    if (classification.isCreate && !classification.isUpdate) {
      console.warn('[Assistant] 🚀 Exécution DIRECTE (CREATE)');

      // Utiliser le parseur pour extraire les données de création
      const { parseQuery } = await import('@/lib/assistant/query-parser');
      const availableCollabs: string[] = []; // TODO: récupérer depuis la DB si nécessaire
      const availableStyles = ['Techno', 'House', 'DNB', 'Dubstep', 'Trance'];

      const parseResult = parseQuery(normalizedInput, availableCollabs, availableStyles);

      if (parseResult.createData && parseResult.createData.name) {
        const validStyles = ['Techno', 'House', 'DNB', 'Dubstep', 'Trance'] as const;
        const validStatuses = [
          'EN_COURS',
          'TERMINE',
          'ANNULE',
          'A_REWORK',
          'GHOST_PRODUCTION',
          'ARCHIVE',
        ] as const;

        const createParams = {
          name: parseResult.createData.name,
          style:
            parseResult.createData.style &&
            validStyles.includes(parseResult.createData.style as (typeof validStyles)[number])
              ? (parseResult.createData.style as (typeof validStyles)[number])
              : undefined,
          collab: parseResult.createData.collab || undefined,
          status: (parseResult.createData.status &&
          validStatuses.includes(parseResult.createData.status as (typeof validStatuses)[number])
            ? parseResult.createData.status
            : 'EN_COURS') as (typeof validStatuses)[number],
          deadline: parseResult.createData.deadline || undefined,
          label: undefined,
        };

        try {
          if (createProjects && typeof createProjects.execute === 'function') {
            // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
            const result = await createProjects.execute(createParams, {});
            const typedResult = result as { project?: { id: string }; message?: string };

            if (typedResult && typeof typedResult === 'object') {
              revalidatePath('/projects');

              // Sauvegarder le contexte
              const createdProjectId = typedResult.project?.id;
              updateConversationContext(currentUserId, {
                lastActionType: 'create',
                lastActionTimestamp: Date.now(),
                ...(createdProjectId
                  ? { lastProjectIds: [createdProjectId] }
                  : { lastProjectIds: [] }),
              });

              // Retourner le message avec les données du projet pour déclencher l'événement côté client
              const message =
                typedResult.message || `Projet "${createParams.name}" créé avec succès.`;
              if (typedResult.project) {
                // Encoder le projet dans la réponse pour que le client puisse le récupérer
                return JSON.stringify({
                  message,
                  createdProject: typedResult.project,
                });
              }
              return message;
            }
          }
        } catch (error) {
          console.error('[Assistant] Erreur exécution directe (Create):', error);
          // Si erreur, continuer vers l'IA comme fallback
        }
      } else {
        console.warn("[Assistant] Create détecté mais pas de nom extrait, passage à l'IA");
      }
    }
  }

  // ========================================
  // FALLBACK IA (GROQ)
  // ========================================

  console.warn("[Assistant] 🤖 Passage à l'IA (Conversationnel ou Fallback)", {
    isComplex: classification.isComplex,
  });

  const availableTools: Record<string, unknown> = {};
  if (!classification.isConversationalQuestion) {
    availableTools.getProjects = getProjects;
    availableTools.updateProjects = updateProjects;
    availableTools.createProjects = createProjects;
  }

  // Choix du modèle : 70B pour les requêtes complexes, 8B pour le reste (plus rapide/économique)
  const modelId = classification.isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

  try {
    const result = await generateText({
      model: groq(modelId),
      prompt: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}\n[SYSTEM INSTRUCTIONS END]\n\n⚠️ FORMAT DES OUTILS (CRITIQUE):
- Utilisez UNIQUEMENT le format JSON fourni par le système pour appeler les outils
- ❌ JAMAIS de format XML comme <function=createProjects>...</function>
- ✅ Utilisez directement l'outil avec les paramètres JSON fournis par le système

Date: ${today}\nUtilisateur: ${currentUserName || 'Inconnu'}\n${isAdmin ? 'Rôle: ADMIN' : ''}\n\n${contextResolutionMessage ? `CONTEXTE: ${contextResolutionMessage}\n\n` : ''}User Query: ${normalizedInput}`,
      // @ts-expect-error - SDK AI v5 type inference issue with tool types
      tools: Object.keys(availableTools).length > 0 ? availableTools : undefined,
    }).catch(async (error: unknown) => {
      console.error('[Assistant] Erreur lors de generateText:', error);
      throw error;
    });

    if (typeof result === 'string') {
      return result as string;
    }

    const { text, toolResults } = result;

    if ((!toolResults || toolResults.length === 0) && text) {
      return text;
    }

    if (toolResults && toolResults.length > 0) {
      const firstResult = toolResults[0];
      const typedResult = (
        firstResult as {
          result?: {
            message?: string;
            count?: number;
            project?: unknown;
            projects?: Array<{ id: string; name: string }>;
          };
          toolName?: string;
        }
      ).result;
      const toolName = (firstResult as { result?: unknown; toolName?: string }).toolName;

      let response = '';
      if (text) response += text + '\n\n';

      if (typedResult) {
        response +=
          typedResult.message ||
          (typedResult.count !== undefined ? `Action effectuée (${typedResult.count})` : '');

        // Si c'est une création de projet, inclure le projet dans la réponse
        if (toolName === 'createProjects' && typedResult.project) {
          return JSON.stringify({
            message: response,
            createdProject: typedResult.project,
          });
        }

        // Si c'est getProjects (liste), retourner les données structurées pour l'affichage en tableau
        if (
          toolName === 'getProjects' &&
          typedResult.projects &&
          Array.isArray(typedResult.projects)
        ) {
          const projects = typedResult.projects;
          // Déterminer les champs à afficher
          // IMPORTANT: Toujours re-détecter depuis la requête originale pour capturer "tous les détails"
          const { fieldsToShow: reDetectedFields } = detectFilters(
            normalizedInput,
            lowerQuery,
            [],
            []
          );
          let fieldsToShow: string[] = [];

          if (reDetectedFields && reDetectedFields.length > 0) {
            // Si des champs ont été explicitement demandés (ex: "tous les détails"), les utiliser
            fieldsToShow = reDetectedFields;
            console.warn(
              '[Assistant] Champs à afficher détectés depuis requête (IA):',
              fieldsToShow
            );
          } else {
            // Sinon, utiliser les champs par défaut + ceux filtrés
            fieldsToShow = ['progress', 'status', 'deadline'];

            // Ajouter les champs supplémentaires si filtrés
            if (filters.collab && !fieldsToShow.includes('collab')) fieldsToShow.push('collab');
            if (filters.style && !fieldsToShow.includes('style')) fieldsToShow.push('style');
            if (filters.releaseDate && !fieldsToShow.includes('releaseDate'))
              fieldsToShow.push('releaseDate');
            console.warn('[Assistant] Champs par défaut utilisés (IA):', fieldsToShow);
          }

          return JSON.stringify({
            message: response,
            data: {
              projects,
              type: 'list' as const,
              fieldsToShow,
            },
          });
        }
      }
      return response;
    }

    return text || "Je n'ai pas compris.";
  } catch (error) {
    if (error instanceof Error) return `Erreur IA: ${error.message}`;
    return 'Erreur inconnue.';
  }
}
