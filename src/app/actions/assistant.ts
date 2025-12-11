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
import { detectStatusFromQuery } from '@/lib/assistant/parsers/status-detector';
import { detectProgressFromQuery } from '@/lib/assistant/parsers/progress-detector';
import { detectDeadlineFromQuery } from '@/lib/assistant/parsers/deadline-detector';

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

  try {
    // Log des outils disponibles
    console.log('[Assistant] Démarrage avec outils:', {
      toolsAvailable: ['getProjects', 'updateProjects'],
      getProjectsType: typeof getProjects,
      updateProjectsType: typeof updateProjects,
      getProjectsKeys: getProjects ? Object.keys(getProjects) : [],
      updateProjectsKeys: updateProjects ? Object.keys(updateProjects) : [],
      originalInput: userInput.substring(0, 100),
      normalizedInput: normalizedInput.substring(0, 100),
      userId: currentUserId,
      userName: currentUserName,
      isAdmin,
    });

    // Vérifier que les outils sont bien des objets tool
    const toolsObject = {
      getProjects,
      updateProjects,
    };
    console.log('[Assistant] Objet tools passé au SDK:', {
      toolKeys: Object.keys(toolsObject),
      toolsStructure: JSON.stringify(toolsObject, null, 2).substring(0, 500),
    });

    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `Tu es un assistant de gestion de projet. Nous sommes le ${today}.
               Tu dois aider à modifier les projets en masse pour l'utilisateur connecté.
               
               Statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
               
               ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT :
               
               1. DISTINCTION QUESTION vs COMMANDE :
                  - QUESTION (utilise getProjects OBLIGATOIREMENT) : "Combien", "Quels", "Liste", "Montre", "Quels projets", "Combien de projets"
                    ⚠️ CRITIQUE : Pour TOUTES les questions sur les projets, tu DOIS appeler getProjects, JAMAIS répondre directement sans outil.
                    Même si la question contient des fautes (ex: "combie, j'ai de gausteprauds?"), tu DOIS appeler getProjects avec les paramètres détectés.
                  - COMMANDE (utilise updateProjects) : "Déplace", "Marque", "Change", "Modifie", "Mets", "Met à jour"
                  
               1.1. PARAMÈTRES pour getProjects (utilise-les pour FILTRER les résultats) :
                  ✅ status (enum) : Filtrer par statut si l'utilisateur en mentionne un
                    Statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
                    
                    🧠 COMPRÉHENSION INTELLIGENTE DES STATUTS :
                    Tu dois comprendre les variations et fautes d'orthographe par toi-même :
                    - "ghost production", "ghost prod", "ghos prod", "goastprod", "gauspraud", "gausprod", "gaostprod", "gausteprauds" → GHOST_PRODUCTION
                    - "terminé", "terminés", "fini", "finis", "termine" → TERMINE
                    - "annulé", "annulés", "annul", "cancel" → ANNULE
                    - "en cours", "encours", "en cour" → EN_COURS
                    - "archive", "archivé", "archivés" → ARCHIVE
                    - "rework", "à rework", "a rework" → A_REWORK
                    
                    Utilise ta compréhension du langage naturel pour identifier le statut le plus proche, même avec des fautes importantes.
                    Exemple : "combie, j'ai de gausteprauds?" → Tu dois appeler getProjects({ status: "GHOST_PRODUCTION" })
                  ✅ minProgress (nombre 0-100) : Filtrer par progression minimum
                  ✅ maxProgress (nombre 0-100) : Filtrer par progression maximum
                  ✅ hasDeadline (boolean) : Filtrer les projets avec/sans deadline
                  ✅ deadlineDate (string ISO) : Filtrer par date de deadline
                  
               2. PARAMÈTRES EXACTS pour updateProjects (utilise EXACTEMENT ces noms, rien d'autre) :
                  ✅ minProgress (nombre 0-100) - pour filtrer par progression minimum
                  ✅ maxProgress (nombre 0-100) - pour filtrer par progression maximum
                  ✅ newDeadline (string ISO YYYY-MM-DD) - pour définir une nouvelle deadline
                  ✅ newStatus (enum) - pour changer le statut (EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE)
                  
                  ❌ N'UTILISE JAMAIS : nouvelleDeadline, deadline, progression, minProgression, maxProgression, statut, status, update, etc.
                  
               3. EXEMPLES CORRECTS :
                  - "Déplace deadline à demain pour projets à 80%" → updateProjects({ maxProgress: 80, newDeadline: "2024-12-12" })
                  - "Marque TERMINE les projets à 100%" → updateProjects({ minProgress: 100, maxProgress: 100, newStatus: "TERMINE" })
                  - "Combien de projets j'ai ?" → getProjects({})
                  - "Combien de projets goastprod j'ai ?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "j'ai cb de gauspraud?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "combie, j'ai de gausteprauds?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "Quels projets ghost production ?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "projets annulés" → getProjects({ status: "ANNULE" })
                  - "projets finis" → getProjects({ status: "TERMINE" })
                  
                  ⚠️ CRITIQUE : Dans TOUS ces exemples, tu DOIS appeler l'outil, JAMAIS répondre directement.
                  
               3.1. FORMAT D'APPEL DES OUTILS :
                  ⚠️ CRITIQUE : 
                  - Utilise UNIQUEMENT le format JSON pour les paramètres, JAMAIS de format XML ou autre
                  - Utilise UNIQUEMENT les paramètres définis dans le schéma : status, minProgress, maxProgress, hasDeadline, deadlineDate
                  - N'AJOUTE JAMAIS de paramètres qui n'existent pas (comme "tag", "label", etc.)
                  ✅ CORRECT : getProjects({ "status": "GHOST_PRODUCTION" })
                  ❌ INCORRECT : <function=getProjects>{"status": "GHOST_PRODUCTION"}</function>
                  ❌ INCORRECT : getProjects({ "status": "GHOST_PRODUCTION", "tag": "bg" }) // "tag" n'existe pas !
                  ❌ INCORRECT : getProjects(status="GHOST_PRODUCTION")
                  
               4. Pour les dates relatives, convertis-les en ISO YYYY-MM-DD :
                  - "demain" → date de demain
                  - "semaine prochaine" → date dans 7 jours
                  
               5. ⚠️ IMPORTANT : Pour TOUTES les questions sur les projets (combien, quels, liste, etc.), 
                  tu DOIS appeler getProjects, même si la question contient des fautes d'orthographe.
                  Ne réponds JAMAIS directement sans appeler l'outil pour les questions nécessitant des données de la base.
                  
                  Seule exception : si on te demande juste la liste des statuts disponibles, tu peux répondre directement : 
                  EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE.
               
               6. L'utilisateur connecté est "${currentUserName || 'utilisateur'}"${isAdmin ? ' (ADMIN)' : ''}. 
                  ${!isAdmin ? "⚠️ IMPORTANT : Vous ne pouvez accéder qu'à VOS PROPRES projets. Les mentions d'autres utilisateurs seront ignorées." : "En tant qu'ADMIN, vous pouvez accéder aux projets de tous les utilisateurs si un nom est mentionné."}
                  Si un nom d'utilisateur est mentionné dans la requête (ex: "pour Larian67"), 
                  ${isAdmin ? 'les projets seront filtrés pour cet utilisateur.' : 'cela sera ignoré et seuls vos projets seront utilisés.'}
                  Sinon, les projets de l'utilisateur connecté seront utilisés.`,
      prompt: normalizedInput,
      tools: {
        getProjects,
        updateProjects,
      },
    }).catch(async (error: any) => {
      // Log détaillé de l'erreur
      const errorDetails = {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        errorStack: error instanceof Error ? error.stack : undefined,
        userInput: userInput.substring(0, 200),
        toolsProvided: ['getProjects', 'updateProjects'],
        responseBody: error?.responseBody,
        failedGeneration: error?.responseBody?.error?.failed_generation,
      };

      console.error('[Assistant] Erreur lors de generateText:', errorDetails);

      // Si l'erreur est due à un format invalide ou des paramètres invalides de l'IA
      if (error?.responseBody?.error?.code === 'tool_use_failed') {
        const failedGeneration = error?.responseBody?.error?.failed_generation;
        console.warn(
          "[Assistant] L'IA a généré un format invalide ou des paramètres invalides, extraction et correction"
        );

        // Essayer d'extraire les paramètres valides depuis l'appel invalide
        let extractedParams: any = {};

        if (failedGeneration) {
          // Extraire le JSON depuis le format XML ou texte (gérer aussi les formats sans guillemets)
          const jsonMatch = failedGeneration.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              // Remplacer les clés sans guillemets par des clés avec guillemets pour JSON valide
              let jsonStr = jsonMatch[0]
                .replace(/(\w+):/g, '"$1":') // Ajouter guillemets aux clés
                .replace(/null/g, 'null') // Garder null tel quel
                .replace(/undefined/g, 'null'); // Remplacer undefined par null

              const parsed = JSON.parse(jsonStr);

              // Convertir les formats invalides en formats valides
              // "filters: {progression: {gte: 70, lt: 100}}" → minProgress: 70, maxProgress: 100
              if (parsed.filters && parsed.filters.progression) {
                const prog = parsed.filters.progression;
                if (prog.gte !== undefined && prog.gte !== null) {
                  extractedParams.minProgress = prog.gte;
                }
                if (prog.lte !== undefined && prog.lte !== null) {
                  extractedParams.maxProgress = prog.lte;
                }
                if (prog.lt !== undefined && prog.lt !== null) {
                  extractedParams.maxProgress = prog.lt;
                }
                if (prog.gt !== undefined && prog.gt !== null) {
                  extractedParams.minProgress = prog.gt;
                }
              }

              // Convertir les formats invalides en formats valides
              // "progression: {min: 70, max: null}" → maxProgress: 70
              // "progression: {op: '<', value: 70}" → maxProgress: 70
              // "progression: {inf: false, sup: 0.7}" → maxProgress: 70 (0.7 = 70%)
              if (parsed.progression) {
                // Format avec inf/sup (décimal) : {inf: false, sup: 0.7}
                if (parsed.progression.sup !== undefined && parsed.progression.sup !== null) {
                  // Convertir décimal en pourcentage (0.7 → 70)
                  const supValue =
                    typeof parsed.progression.sup === 'number'
                      ? parsed.progression.sup < 1
                        ? parsed.progression.sup * 100
                        : parsed.progression.sup
                      : parsed.progression.sup;
                  extractedParams.maxProgress = Math.round(supValue);
                }
                if (
                  parsed.progression.inf !== undefined &&
                  parsed.progression.inf !== null &&
                  parsed.progression.inf !== false
                ) {
                  // Convertir décimal en pourcentage
                  const infValue =
                    typeof parsed.progression.inf === 'number'
                      ? parsed.progression.inf < 1
                        ? parsed.progression.inf * 100
                        : parsed.progression.inf
                      : parsed.progression.inf;
                  extractedParams.minProgress = Math.round(infValue);
                }

                // Format avec opérateur : {op: '<', value: 70}
                if (parsed.progression.op && parsed.progression.value !== undefined) {
                  const op = parsed.progression.op;
                  const value = parsed.progression.value;

                  if (op === '<' || op === '&lt;') {
                    // "inférieur à" ou "<" → maxProgress
                    extractedParams.maxProgress = value;
                  } else if (op === '>' || op === '&gt;') {
                    // "supérieur à" ou ">" → minProgress
                    extractedParams.minProgress = value;
                  } else if (op === '=' || op === '==') {
                    // "égal à" → minProgress et maxProgress
                    extractedParams.minProgress = value;
                    extractedParams.maxProgress = value;
                  }
                }

                // Format avec min/max : {min: 70, max: null}
                if (parsed.progression.min !== undefined && parsed.progression.min !== null) {
                  extractedParams.minProgress = parsed.progression.min;
                }
                if (parsed.progression.max !== undefined && parsed.progression.max !== null) {
                  extractedParams.maxProgress = parsed.progression.max;
                }
              }

              // Filtrer uniquement les paramètres valides pour getProjects
              const validParams = [
                'status',
                'minProgress',
                'maxProgress',
                'hasDeadline',
                'deadlineDate',
              ];
              for (const key of validParams) {
                if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== '') {
                  extractedParams[key] = parsed[key];
                }
              }

              console.log(
                "[Assistant] Paramètres extraits depuis l'appel invalide:",
                extractedParams
              );
            } catch (e) {
              // Si le parsing JSON échoue, essayer d'extraire manuellement
              console.warn(
                '[Assistant] Impossible de parser JSON, extraction manuelle des paramètres'
              );

              // Extraire "progression: {min: 70}" ou "maxProgress: 70"
              const progressionMatch = failedGeneration.match(
                /progression[:\s]*\{[^}]*min[:\s]*(\d+)/i
              );
              if (progressionMatch) {
                extractedParams.minProgress = parseInt(progressionMatch[1], 10);
              }

              const maxProgMatch = failedGeneration.match(
                /progression[:\s]*\{[^}]*max[:\s]*(\d+)/i
              );
              if (maxProgMatch) {
                extractedParams.maxProgress = parseInt(maxProgMatch[1], 10);
              }

              // Pour "inférieur à 70%" ou "< à 70%", c'est maxProgress = 70
              const inferieurMatch = failedGeneration.match(/(?:inf[ée]rieur|<)[^\d]*(\d+)/i);
              if (inferieurMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(inferieurMatch[1], 10);
              }

              // Pour "supérieur à 70%" ou "> à 70%", c'est minProgress = 70
              const superieurMatch = failedGeneration.match(/(?:sup[ée]rieur|>)[^\d]*(\d+)/i);
              if (superieurMatch && !extractedParams.minProgress) {
                extractedParams.minProgress = parseInt(superieurMatch[1], 10);
              }

              // Extraire "filters: {progression: {gte: 70, lt: 100}}"
              const filtersGteMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*gte[:\s]*(\d+)/i
              );
              if (filtersGteMatch && !extractedParams.minProgress) {
                extractedParams.minProgress = parseInt(filtersGteMatch[1], 10);
              }

              const filtersLtMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*lt[:\s]*(\d+)/i
              );
              if (filtersLtMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(filtersLtMatch[1], 10);
              }

              const filtersLteMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*lte[:\s]*(\d+)/i
              );
              if (filtersLteMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(filtersLteMatch[1], 10);
              }

              // Extraire "progression: {inf: false, sup: 0.7}" (format décimal)
              const supMatch = failedGeneration.match(/progression[^}]*sup[:\s]*([\d.]+)/i);
              if (supMatch && !extractedParams.maxProgress) {
                const supValue = parseFloat(supMatch[1]);
                // Convertir décimal en pourcentage (0.7 → 70)
                extractedParams.maxProgress = Math.round(supValue < 1 ? supValue * 100 : supValue);
              }

              const infMatch = failedGeneration.match(/progression[^}]*inf[:\s]*([\d.]+)/i);
              if (infMatch && !extractedParams.minProgress && infMatch[1] !== 'false') {
                const infValue = parseFloat(infMatch[1]);
                // Convertir décimal en pourcentage
                extractedParams.minProgress = Math.round(infValue < 1 ? infValue * 100 : infValue);
              }

              // Extraire directement "value: 70" si présent
              const valueMatch = failedGeneration.match(/["']?value["']?\s*:\s*(\d+)/i);
              if (valueMatch && failedGeneration.match(/["']?op["']?\s*:\s*["']?[<&]/i)) {
                // Si op est "<", c'est maxProgress
                if (!extractedParams.maxProgress) {
                  extractedParams.maxProgress = parseInt(valueMatch[1], 10);
                }
              } else if (valueMatch && failedGeneration.match(/["']?op["']?\s*:\s*["']?[>]/i)) {
                // Si op est ">", c'est minProgress
                if (!extractedParams.minProgress) {
                  extractedParams.minProgress = parseInt(valueMatch[1], 10);
                }
              }

              // Si on a "gte: 70, lt: 100" pour "< à 70%", c'est incorrect
              // On doit utiliser maxProgress: 70 (pas minProgress: 70)
              // Vérifier si la requête contient "inférieur" ou "<"
              if (
                extractedParams.minProgress &&
                !extractedParams.maxProgress &&
                (normalizedInput.includes('inférieur') || normalizedInput.includes('<'))
              ) {
                // C'est probablement une erreur - "inférieur à 70%" devrait être maxProgress: 70
                extractedParams.maxProgress = extractedParams.minProgress;
                delete extractedParams.minProgress;
              }
            }
          }
        }

        // Utiliser la détection automatique pour compléter les paramètres manquants
        // Ne pas utiliser le statut extrait si c'était une erreur (ex: A_REWORK détecté incorrectement)
        const detectedStatus = detectStatusFromQuery(normalizedInput);
        const detectedProgress = detectProgressFromQuery(normalizedInput);

        // Construire les paramètres finaux
        const finalParams: any = {
          ...extractedParams,
        };

        // Ne garder le statut extrait que s'il est valide et cohérent avec la requête
        // Si la requête ne mentionne pas de statut, ne pas utiliser un statut extrait par erreur
        if (detectedStatus && !finalParams.status) {
          finalParams.status = detectedStatus;
        } else if (extractedParams.status && !detectedStatus) {
          // Si on a extrait un statut mais qu'il n'est pas détecté dans la requête, le retirer
          // (probablement une erreur de l'IA)
          delete finalParams.status;
        }

        if (detectedProgress.minProgress !== undefined && finalParams.minProgress === undefined) {
          finalParams.minProgress = detectedProgress.minProgress;
        }
        if (detectedProgress.maxProgress !== undefined && finalParams.maxProgress === undefined) {
          finalParams.maxProgress = detectedProgress.maxProgress;
        }

        // Appeler directement getProjects avec les paramètres corrigés
        try {
          console.log('[Assistant] Appel direct avec paramètres corrigés:', finalParams);
          if (getProjects && typeof getProjects.execute === 'function') {
            const result = await getProjects.execute(finalParams);
            if (result && typeof result === 'object' && 'count' in result && 'message' in result) {
              return `J'ai trouvé ${result.count} projet(s) correspondant à votre recherche. ${result.message}`;
            }
          }
        } catch (executeError) {
          console.error("[Assistant] Erreur lors de l'exécution directe:", executeError);
        }
      }

      throw error;
    });

    // Vérifier que result est un objet GenerateTextResult, pas une string
    if (typeof result === 'string') {
      return result;
    }

    const { text, toolResults } = result;

    // Log des résultats
    console.log('[Assistant] Résultats reçus:', {
      hasText: !!text,
      textLength: text?.length,
      hasToolResults: !!toolResults,
      toolResultsLength: toolResults?.length,
      toolResults: toolResults?.map((r: any) => ({
        toolName: r.toolName,
        toolCallId: r.toolCallId,
        hasResult: !!r.result,
        resultType: typeof r.result,
        resultKeys: r.result ? Object.keys(r.result) : [],
      })),
    });

    // Si l'IA n'a pas appelé d'outil mais a retourné du texte, c'est qu'elle a répondu directement
    // On retourne sa réponse telle quelle (elle devrait avoir compris la question)
    if ((!toolResults || toolResults.length === 0) && text) {
      console.log(
        "[Assistant] L'IA a répondu directement sans appeler d'outil, retour de sa réponse"
      );
      return text;
    }

    // Gestion du retour
    if (toolResults && toolResults.length > 0) {
      const firstResult = toolResults[0];

      console.log('[Assistant] Traitement du premier résultat:', {
        firstResultKeys: Object.keys(firstResult || {}),
        firstResult: JSON.stringify(firstResult, null, 2).substring(0, 500),
      });

      // Le SDK Vercel AI retourne les résultats différemment selon la version
      // Essayer différentes façons d'accéder au résultat
      let toolName = (firstResult as any).toolName;
      let result = (firstResult as any).result;

      console.log('[Assistant] Extraction initiale:', {
        toolName,
        hasResult: !!result,
        resultType: typeof result,
      });

      // Si pas de toolName, essayer de le déduire
      if (!toolName && (firstResult as any).toolCallId) {
        const toolCallId = (firstResult as any).toolCallId as string;
        console.log('[Assistant] Extraction depuis toolCallId:', { toolCallId });
        if (toolCallId.includes('getProjects')) toolName = 'getProjects';
        else if (toolCallId.includes('updateProjects')) toolName = 'updateProjects';
      }

      // Si pas de result direct, essayer d'autres propriétés
      if (!result) {
        result = (firstResult as any).output || (firstResult as any).value || firstResult;
        console.log('[Assistant] Résultat extrait depuis propriétés alternatives:', {
          hasResult: !!result,
          resultType: typeof result,
        });
      }

      // Vérifier que result existe et est un objet
      if (!result || typeof result !== 'object') {
        console.warn("[Assistant] Résultat d'outil invalide:", {
          toolName,
          result,
          resultType: typeof result,
          firstResult: JSON.stringify(firstResult, null, 2).substring(0, 500),
        });
        return text || "Erreur : Résultat d'outil invalide.";
      }

      console.log('[Assistant] Résultat validé:', {
        toolName,
        hasCount: 'count' in result,
        hasMessage: 'message' in result,
        hasProjects: 'projects' in result,
        projectsLength: (result as any).projects?.length,
      });

      const typedResult = result as {
        count?: number;
        message?: string;
        projects?: Array<{
          id: string;
          name: string;
          progress: number | null;
          status: string;
          deadline: string | null;
        }>;
      };

      // Si c'est getProjects (lecture), formater la réponse avec les données
      if (toolName === 'getProjects') {
        if (typedResult.count === 0 || !typedResult.projects || typedResult.projects.length === 0) {
          return typedResult.message || `Je n'ai trouvé aucun projet correspondant à vos critères.`;
        }

        // Formater une réponse détaillée avec les projets trouvés
        const count = typedResult.count ?? typedResult.projects.length;

        // Si c'est juste une question de comptage, retourner un message simple
        const firstResult = toolResults[0];
        const toolInput = (firstResult as any).input || {};
        const isSimpleCount =
          !toolInput.status &&
          !toolInput.minProgress &&
          !toolInput.maxProgress &&
          !toolInput.hasDeadline &&
          !toolInput.deadlineDate;

        if (isSimpleCount && count > 5) {
          // Pour les questions simples de comptage, retourner juste le nombre
          return typedResult.message || `Vous avez ${count} projet(s).`;
        }

        let response = typedResult.message || `J'ai trouvé ${count} projet(s) :\n\n`;

        // Limiter l'affichage à 10 projets max pour la lisibilité
        const projectsToShow = typedResult.projects.slice(0, 10);
        projectsToShow.forEach((project, index) => {
          response += `${index + 1}. ${project.name}`;
          if (project.progress !== null) {
            response += ` (${project.progress}%)`;
          }
          if (project.status) {
            response += ` - ${project.status}`;
          }
          if (project.deadline) {
            response += ` - Deadline: ${project.deadline}`;
          }
          response += '\n';
        });

        if (count > 10) {
          response += `\n... et ${count - 10} autre(s) projet(s).`;
        }

        return response;
      }

      // Si c'est updateProjects (modification), confirmer la mise à jour
      if (toolName === 'updateProjects') {
        revalidatePath('/projects'); // Rafraîchir la page des projets

        if (typedResult.message) {
          return typedResult.message;
        }

        if (typedResult.count !== undefined) {
          return `Succès ! J'ai mis à jour ${typedResult.count} projet(s).`;
        }

        // Fallback si aucune information disponible
        return 'Mise à jour effectuée.';
      }
    }

    return text; // Réponse conversationnelle si pas d'action
  } catch (error) {
    console.error('AI Error:', error);

    // Gestion d'erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('GROQ_API_KEY')) {
        return "Erreur : La clé API Groq n'est pas configurée. Veuillez ajouter GROQ_API_KEY dans votre fichier .env.local";
      }
      return `Désolé, une erreur est survenue : ${error.message}`;
    }

    return 'Désolé, une erreur est survenue lors du traitement.';
  }
}
