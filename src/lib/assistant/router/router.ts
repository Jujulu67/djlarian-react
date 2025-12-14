/**
 * Routeur central pour les commandes projets
 *
 * Responsabilités :
 * - Classifier les requêtes utilisateur
 * - Router vers le bon handler (listing, création, modification, note, général)
 * - Garantir que le listing/filtrage/tri se fait côté client (0 DB)
 * - Préparer les actions nécessitant confirmation
 * - S'assurer que Groq ne peut jamais déclencher d'actions
 */

import type { Project } from '@/components/projects/types';
import type { QueryFilters } from '@/components/assistant/types';
import {
  ProjectCommandType,
  type ProjectCommandResult,
  type ProjectFilter,
  type ProjectMutation,
  type PendingConfirmationAction,
  type RouterContext,
  type RouterOptions,
} from './types';
import { classifyQuery } from '../query-parser/classifier';
import { detectFilters } from '../query-parser/filters';
import { extractUpdateData } from '../query-parser/updates';
import { extractCreateData } from '../query-parser/creates';
import { filterProjects } from '@/components/assistant/utils/filterProjects';
import { debugLog, debugLogObject, isAssistantDebugEnabled } from '../utils/debug';
import { sanitizeForLogs, sanitizeObjectForLogs } from '../utils/sanitize-logs';
import type { ConversationMessage } from '../conversational/memory-manager';

/**
 * Applique les filtres et le tri sur les projets en mémoire (0 DB)
 */
function applyProjectFilterAndSort(
  projects: Project[],
  filter: ProjectFilter
): { filtered: Project[]; count: number } {
  // Appliquer les filtres
  const filterResult = filterProjects(projects, filter);
  let filtered = filterResult.filtered;

  // Appliquer le tri
  if (filter.sortBy) {
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[filter.sortBy!];
      const bValue = b[filter.sortBy!];

      // Gérer les valeurs null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Comparaison selon le type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return filter.sortDirection === 'desc' ? -comparison : comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filter.sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return filter.sortDirection === 'desc' ? -comparison : comparison;
      }

      return 0;
    });
  }

  return { filtered, count: filtered.length };
}

/**
 * Calcule la liste des projets impactés par une mutation via filtre
 */
function calculateAffectedProjects(projects: Project[], filters: QueryFilters): Project[] {
  const filterResult = filterProjects(projects, filters);
  return filterResult.filtered;
}

/**
 * Vérifie si un filtre est vide ou non significatif (aucun critère de filtrage réel)
 * Gère les cas : undefined, null, chaînes vides, tableaux vides
 */
function isFilterEmpty(filter: QueryFilters | ProjectFilter | undefined | null): boolean {
  if (!filter) {
    return true;
  }

  // Vérifier chaque propriété : doit être absente, undefined, null, ou chaîne vide
  const hasStatus = filter.status !== undefined && filter.status !== null && filter.status !== '';
  const hasMinProgress = filter.minProgress !== undefined && filter.minProgress !== null;
  const hasMaxProgress = filter.maxProgress !== undefined && filter.maxProgress !== null;
  const hasCollab = filter.collab !== undefined && filter.collab !== null && filter.collab !== '';
  const hasStyle = filter.style !== undefined && filter.style !== null && filter.style !== '';
  const hasLabel = filter.label !== undefined && filter.label !== null && filter.label !== '';
  const hasDeadline = filter.hasDeadline !== undefined && filter.hasDeadline !== null;
  const hasName = filter.name !== undefined && filter.name !== null && filter.name !== '';
  const hasNoProgress = filter.noProgress !== undefined && filter.noProgress !== null;
  const hasYear = 'year' in filter && filter.year !== undefined && filter.year !== null;

  // Vérifier aussi sortBy et sortDirection (pour ProjectFilter)
  const hasSortBy = 'sortBy' in filter && filter.sortBy !== undefined && filter.sortBy !== null;
  const hasSortDirection =
    'sortDirection' in filter &&
    filter.sortDirection !== undefined &&
    filter.sortDirection !== null;

  return (
    !hasStatus &&
    !hasMinProgress &&
    !hasMaxProgress &&
    !hasCollab &&
    !hasStyle &&
    !hasLabel &&
    !hasDeadline &&
    !hasName &&
    !hasNoProgress &&
    !hasYear &&
    !hasSortBy &&
    !hasSortDirection
  );
}

/**
 * Vérifie si un filtre est un filtre scoping (qui restreint réellement un subset métier)
 *
 * Un filtre scoping est un filtre qui restreint un subset métier (ex: status, collab, style, etc.)
 *
 * Retourne false si :
 * - Le filtre est vide
 * - Le filtre contient uniquement hasDeadline (qui peut être un qualifier de mutation, pas un filtre scoping)
 * - Le filtre contient uniquement des "qualifiers techniques" non scoping
 *
 * Retourne true si le filtre contient au moins un critère scoping réel (status, collab, style, label, progress, etc.)
 */
export function isScopingFilter(filter: QueryFilters | ProjectFilter | undefined | null): boolean {
  if (!filter) {
    return false;
  }

  // Vérifier chaque propriété scoping
  const hasStatus = filter.status !== undefined && filter.status !== null && filter.status !== '';
  const hasMinProgress = filter.minProgress !== undefined && filter.minProgress !== null;
  const hasMaxProgress = filter.maxProgress !== undefined && filter.maxProgress !== null;
  const hasCollab = filter.collab !== undefined && filter.collab !== null && filter.collab !== '';
  const hasStyle = filter.style !== undefined && filter.style !== null && filter.style !== '';
  const hasLabel = filter.label !== undefined && filter.label !== null && filter.label !== '';
  const hasLabelFinal =
    'labelFinal' in filter &&
    filter.labelFinal !== undefined &&
    filter.labelFinal !== null &&
    filter.labelFinal !== '';
  const hasName = filter.name !== undefined && filter.name !== null && filter.name !== '';
  const hasNoProgress = filter.noProgress !== undefined && filter.noProgress !== null;
  const hasYear = 'year' in filter && filter.year !== undefined && filter.year !== null;
  const hasDeadline = filter.hasDeadline !== undefined && filter.hasDeadline !== null;

  // Si on a au moins un critère scoping réel (autre que hasDeadline), c'est un filtre scoping
  const hasScopingCriteria =
    hasStatus ||
    hasMinProgress ||
    hasMaxProgress ||
    hasCollab ||
    hasStyle ||
    hasLabel ||
    hasLabelFinal ||
    hasName ||
    hasNoProgress ||
    hasYear;

  // Si on a au moins un critère scoping, c'est un filtre scoping
  if (hasScopingCriteria) {
    return true;
  }

  // Si on a uniquement hasDeadline dans les filters, c'est un filtre scoping explicite
  // (car si hasDeadline est dans filters, c'est que l'utilisateur l'a explicitement demandé,
  // contrairement à hasDeadline dans updateData qui peut être juste une conséquence de la mutation)
  if (hasDeadline) {
    return true;
  }

  // Sinon, pas de filtre scoping
  return false;
}

/**
 * Résume un filtre pour les logs (affiche seulement les propriétés non vides)
 */
function summarizeFilter(
  filter: QueryFilters | ProjectFilter | undefined | null
): Record<string, any> {
  if (!filter) {
    return { empty: true };
  }

  const summary: Record<string, any> = {};
  if (filter.status) summary.status = filter.status;
  if (filter.minProgress !== undefined) summary.minProgress = filter.minProgress;
  if (filter.maxProgress !== undefined) summary.maxProgress = filter.maxProgress;
  if (filter.collab) summary.collab = filter.collab;
  if (filter.style) summary.style = filter.style;
  if (filter.label) summary.label = filter.label;
  if (filter.hasDeadline !== undefined) summary.hasDeadline = filter.hasDeadline;
  if (filter.name) summary.name = filter.name;
  if (filter.noProgress !== undefined) summary.noProgress = filter.noProgress;
  if ('year' in filter && filter.year !== undefined) summary.year = filter.year;
  if ('sortBy' in filter && filter.sortBy) summary.sortBy = filter.sortBy;
  if ('sortDirection' in filter && filter.sortDirection)
    summary.sortDirection = filter.sortDirection;

  return Object.keys(summary).length === 0 ? { empty: true } : summary;
}

/**
 * Génère un ID unique pour une action en attente
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Appelle l'API Groq pour obtenir une réponse conversationnelle
 * Utilise fetch vers /api/assistant/groq (fonctionne côté client et serveur)
 */
async function callGroqApi(
  message: string,
  context: { projectCount: number; collabCount: number; styleCount: number },
  conversationHistory?: ConversationMessage[],
  requestId?: string,
  isComplex?: boolean,
  isFirstAssistantTurn?: boolean
): Promise<string> {
  try {
    // Construire l'URL de l'API
    // Côté client: URL relative fonctionne
    // Côté serveur: utiliser headers() ou NEXT_PUBLIC_SITE_URL si disponible
    let apiUrl = '/api/assistant/groq';

    // Si on est côté serveur et qu'on a NEXT_PUBLIC_SITE_URL, l'utiliser
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
      apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${apiUrl}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        conversationHistory,
        requestId,
        isComplex: isComplex || false,
        isFirstAssistantTurn:
          isFirstAssistantTurn !== undefined
            ? isFirstAssistantTurn
            : !conversationHistory || conversationHistory.length === 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Groq API error (${response.status}): ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.text || typeof data.text !== 'string') {
      throw new Error('Invalid response from Groq API: missing text field');
    }

    return data.text;
  } catch (error) {
    // Log l'erreur (sanitizer)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeForLogs(errorMessage, 200);
    console.error("[Router] ❌ Erreur lors de l'appel à Groq API", {
      requestId,
      error: sanitizedError,
    });

    // Retourner un message de fallback
    return `Salut ! 🎵 Je suis LARIAN, ton assistant pour tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}

/**
 * Génère un diff avant→après pour un projet
 */
function generateProjectPreviewDiff(
  project: Project,
  mutation: ProjectMutation
): import('./types').ProjectPreviewDiff {
  const changes: string[] = [];

  // Progress
  if (mutation.newProgress !== undefined) {
    const before = project.progress ?? null;
    const after = mutation.newProgress;
    changes.push(`progress ${before !== null ? `${before}%` : '-'} → ${after}%`);
  }

  // Status
  if (mutation.newStatus) {
    const before = project.status || '-';
    const after = mutation.newStatus;
    changes.push(`status ${before} → ${after}`);
  }

  // Deadline
  if (mutation.pushDeadlineBy && project.deadline) {
    const beforeDate = new Date(project.deadline);
    const afterDate = new Date(beforeDate);
    if (mutation.pushDeadlineBy.days) {
      afterDate.setDate(afterDate.getDate() + mutation.pushDeadlineBy.days);
    }
    if (mutation.pushDeadlineBy.weeks) {
      afterDate.setDate(afterDate.getDate() + mutation.pushDeadlineBy.weeks * 7);
    }
    if (mutation.pushDeadlineBy.months) {
      afterDate.setMonth(afterDate.getMonth() + mutation.pushDeadlineBy.months);
    }
    if (mutation.pushDeadlineBy.years) {
      afterDate.setFullYear(afterDate.getFullYear() + mutation.pushDeadlineBy.years);
    }
    const beforeStr = beforeDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    const afterStr = afterDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    changes.push(`deadline ${beforeStr} → ${afterStr}`);
  } else if (mutation.newDeadline !== undefined) {
    const before = project.deadline
      ? new Date(project.deadline).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '-';
    const after = mutation.newDeadline
      ? new Date(mutation.newDeadline).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '-';
    changes.push(`deadline ${before} → ${after}`);
  }

  // Label
  if (mutation.newLabel !== undefined) {
    const before = project.label || '-';
    const after = mutation.newLabel || '-';
    changes.push(`label ${before} → ${after}`);
  }

  // LabelFinal
  if (mutation.newLabelFinal !== undefined) {
    const before = project.labelFinal || '-';
    const after = mutation.newLabelFinal || '-';
    changes.push(`labelFinal ${before} → ${after}`);
  }

  // Note (ajout)
  if (mutation.newNote) {
    changes.push(
      `note + "${mutation.newNote.substring(0, 30)}${mutation.newNote.length > 30 ? '...' : ''}"`
    );
  }

  return {
    id: project.id,
    name: project.name,
    changes,
  };
}

/**
 * Construit une description lisible de l'action
 */
function buildActionDescription(
  type: ProjectCommandType.UPDATE | ProjectCommandType.ADD_NOTE,
  mutation: ProjectMutation,
  affectedCount: number,
  skippedCount?: number
): string {
  if (type === ProjectCommandType.ADD_NOTE) {
    if (mutation.projectName) {
      return `Ajouter une note au projet "${mutation.projectName}"`;
    }
    return `Ajouter une note à ${affectedCount} projet(s)`;
  }

  // Type UPDATE
  const changes: string[] = [];

  // Gestion spéciale pour pushDeadlineBy (décalage de deadline)
  if (mutation.pushDeadlineBy) {
    const delta = mutation.pushDeadlineBy;
    const parts: string[] = [];
    if (delta.days) {
      parts.push(`${delta.days > 0 ? '+' : ''}${delta.days} jour${delta.days !== 1 ? 's' : ''}`);
    }
    if (delta.weeks) {
      parts.push(
        `${delta.weeks > 0 ? '+' : ''}${delta.weeks} semaine${delta.weeks !== 1 ? 's' : ''}`
      );
    }
    if (delta.months) {
      parts.push(`${delta.months > 0 ? '+' : ''}${delta.months} mois`);
    }
    if (delta.years) {
      parts.push(`${delta.years > 0 ? '+' : ''}${delta.years} an${delta.years !== 1 ? 's' : ''}`);
    }
    if (parts.length > 0) {
      changes.push(`Décaler la deadline de ${parts.join(', ')}`);
    } else {
      changes.push('Décaler la deadline');
    }
  } else {
    // Autres mutations
    if (mutation.newStatus) changes.push(`statut → ${mutation.newStatus}`);
    if (mutation.newDeadline) changes.push(`deadline → ${mutation.newDeadline}`);
    if (mutation.newProgress !== undefined) changes.push(`progression → ${mutation.newProgress}%`);
    if (mutation.newCollab) changes.push(`collab → ${mutation.newCollab}`);
    if (mutation.newStyle) changes.push(`style → ${mutation.newStyle}`);
  }

  let description = `Modifier ${affectedCount} projet(s)`;
  if (changes.length > 0) {
    description += ` : ${changes.join(', ')}`;
  }

  if (skippedCount && skippedCount > 0) {
    description += ` (${skippedCount} projet(s) ignoré(s) - pas de deadline)`;
  }

  return description;
}

/**
 * Route une requête utilisateur vers le bon handler
 *
 * @param userMessage - Message de l'utilisateur
 * @param options - Options du routeur (contexte, historique, etc.)
 * @returns Résultat de la commande (listing, création, action en attente, ou réponse généraliste)
 */
export async function routeProjectCommand(
  userMessage: string,
  options: RouterOptions
): Promise<ProjectCommandResult> {
  const { context, conversationHistory, lastFilters, requestId } = options;
  const { projects, availableCollabs, availableStyles, projectCount } = context;

  // Logs d'entrée (debug) - Sanitizer le message utilisateur
  const sanitizedMessage = sanitizeForLogs(userMessage, 200);
  const logPrefix = requestId ? `[${requestId}]` : '';
  debugLog('router', `${logPrefix} 📥 Entrée du routeur`, {
    requestId,
    message: sanitizedMessage,
    projectsCount: projects.length,
    lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
    lastAppliedFilter: summarizeFilter(context.lastAppliedFilter),
  });

  const lowerQuery = userMessage.toLowerCase();

  // Détecter les filtres depuis la requête
  const { filters, fieldsToShow } = detectFilters(
    userMessage,
    lowerQuery,
    availableCollabs,
    availableStyles
  );

  // Classifier la requête
  const classification = classifyQuery(userMessage, lowerQuery, filters);

  // Logs après classification (debug)
  debugLog('router', '🔍 Classification', {
    isList: classification.isList,
    isCount: classification.isCount,
    isUpdate: classification.isUpdate,
    isCreate: classification.isCreate,
    isConversationalQuestion: classification.isConversationalQuestion,
    hasActionVerb: classification.hasActionVerb,
    understood: classification.understood,
  });

  // Déterminer le chemin de décision
  let decisionPath = 'UNKNOWN';
  if (classification.isConversationalQuestion && !classification.hasActionVerb) {
    decisionPath = 'GENERAL';
  } else if (classification.isList || classification.isCount) {
    decisionPath = 'LIST';
  } else if (classification.isCreate && !classification.isUpdate) {
    decisionPath = 'CREATE';
  } else if (classification.isUpdate) {
    decisionPath = 'UPDATE';
  } else {
    decisionPath = 'GENERAL_FALLBACK';
  }

  debugLog('router', '🎯 DecisionPath', { path: decisionPath });

  // ========================================
  // GUARD : Intercepter "en détail" comme LIST refinement (AVANT Groq)
  // ========================================
  // Détecter une intention "en détail" pour relister le dernier scope en mode détaillé
  const detailIntentPattern =
    /^(en\s+d[ée]tail|en\s+details?|d[ée]tails?|plus\s+de\s+d[ée]tails?|affiche\s+(en\s+)?d[ée]tail|affiche\s+le\s+d[ée]tail)\s*[?]?$/i;
  const isDetailIntent = detailIntentPattern.test(lowerQuery.trim());

  if (isDetailIntent) {
    const { lastListedProjectIds, lastAppliedFilter } = context;
    let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'scope_missing';
    let scopedProjects: Project[];
    let effectiveFilter: ProjectFilter;

    if (lastListedProjectIds && lastListedProjectIds.length > 0) {
      // Priorité 1 : Utiliser les IDs du dernier listing
      scopeSource = 'LastListedIds';
      scopedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
      effectiveFilter = {}; // Pas de filtre, on utilise les IDs

      if (isAssistantDebugEnabled()) {
        console.log('[Router] 🔎 DetailIntent', {
          scopeSource,
          listedCount: scopedProjects.length,
          requestId,
        });
      }

      const count = scopedProjects.length;
      const message =
        count === 0
          ? "Je n'ai trouvé aucun projet correspondant au dernier listing."
          : `J'ai trouvé ${count} projet(s) en détail.`;

      return {
        type: ProjectCommandType.LIST,
        projects: scopedProjects,
        count,
        fieldsToShow: [
          'status',
          'progress',
          'collab',
          'releaseDate',
          'deadline',
          'style',
          'label',
          'labelFinal',
        ],
        message,
        appliedFilter: effectiveFilter,
        listedProjectIds: scopedProjects.map((p) => p.id),
        displayMode: 'detailed',
        requestId,
      };
    } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
      // Priorité 2 : Utiliser le dernier filtre appliqué
      scopeSource = 'LastAppliedFilter';
      const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
      scopedProjects = filtered;
      effectiveFilter = lastAppliedFilter;

      if (isAssistantDebugEnabled()) {
        console.log('[Router] 🔎 DetailIntent', {
          scopeSource,
          listedCount: scopedProjects.length,
          requestId,
        });
      }

      const count = scopedProjects.length;
      const message =
        count === 0
          ? "Je n'ai trouvé aucun projet correspondant au dernier filtre."
          : `J'ai trouvé ${count} projet(s) en détail.`;

      return {
        type: ProjectCommandType.LIST,
        projects: scopedProjects,
        count,
        fieldsToShow: [
          'status',
          'progress',
          'collab',
          'releaseDate',
          'deadline',
          'style',
          'label',
          'labelFinal',
        ],
        message,
        appliedFilter: effectiveFilter,
        listedProjectIds: scopedProjects.map((p) => p.id),
        displayMode: 'detailed',
        requestId,
      };
    } else {
      // Pas de scope récent : demander clarification
      scopeSource = 'scope_missing';

      if (isAssistantDebugEnabled()) {
        console.log('[Router] 🔎 DetailIntent', {
          scopeSource,
          listedCount: 0,
          requestId,
        });
      }

      return {
        type: ProjectCommandType.GENERAL,
        response:
          "Je n'ai pas de scope récent (aucun projet listé précédemment). Pouvez-vous d'abord lister des projets ? (ex: 'liste les en cours')",
        requestId,
      };
    }
  }

  // ========================================
  // ROUTING : Question généraliste → Groq (lecture seule)
  // ========================================
  if (classification.isConversationalQuestion && !classification.hasActionVerb) {
    // Guard: Intercepter les questions sur les fonctionnalités pour éviter les hallucinations
    // ⚠️ IMPORTANT: Ne pas intercepter les vraies commandes (ex: "tu peux passer leur progression à 20%")
    // On détecte uniquement les questions explicites sur les capacités, pas les commandes avec "tu peux"
    const normalized = userMessage.toLowerCase();

    // Sécurité absolue: si on détecte des signaux de mutation, NE JAMAIS intercepter
    // (même si la classification est incorrecte)
    const hasMutationSignals =
      /(\d+%|pourcent|progression|avancement|deadline|date\s*limite|échéance|statut|status|note|label|collab|style|collaborateur|termin[ée]|annul[ée]|en\s*cours)/i.test(
        normalized
      );
    if (hasMutationSignals) {
      // Pas une question sur les capacités, c'est une commande → laisser passer vers Groq normal
      console.log("[Router] 🛡️ Signal de mutation détecté, pas d'interception capabilities");
    } else {
      // Patterns explicites pour questions sur capacités (pas de commandes)
      // Exemples: "quelles sont tes fonctionnalités", "que peux-tu faire", "capabilités", "tu peux faire quoi"
      // Exemples à NE PAS capturer: "tu peux passer leur progression à 20%", "tu peux ajouter un projet"
      const isExplicitCapabilitiesQuestion =
        // Questions directes sur les capacités (début de phrase)
        /^(quelles? sont (tes|vos) (fonctionnalit|capacit)|que (peux|sais)[- ]tu faire|quelles? (sont|tes) (fonctionnalit|capacit)|(dis|dit)[- ]moi (ce que|quelles) (tu peux|tes)|(liste|décris) (tes|vos) (fonctionnalit|capacit))/i.test(
          normalized
        ) ||
        // Questions avec "capabilités" ou "fonctionnalités" seules (mot-clé principal)
        /^(fonctionnalit|capacit)\s*[?]?$/i.test(normalized) ||
        // Questions avec "tu peux faire quoi" / "que sais-tu faire" (variantes)
        /^(tu peux faire quoi|que sais[- ]tu faire)\s*[?]?$/i.test(normalized) ||
        // Questions avec "capabilités" ou "fonctionnalités" en contexte de question (mais pas commande)
        (/(fonctionnalit|capacit|que (peux|sais)[- ]tu|tu peux faire quoi)/i.test(normalized) &&
          // Mais PAS si c'est une commande (contient des verbes d'action + projet/objet)
          !/(passer|mettre|modifier|ajouter|créer|faire) (leur|les|un|une|des|le|la)/i.test(
            normalized
          ));

      if (isExplicitCapabilitiesQuestion) {
        console.log('[Router] 🛡️ Interception question fonctionnalités (réponse hardcodée)');
        return {
          type: ProjectCommandType.GENERAL,
          response: [
            'CAPABILITIES_CONTRACT_v1', // Marqueur stable pour tests anti-flaky
            'Je suis **LARIAN BOT** (assistant studio de gestion de projets musicaux).',
            '',
            '**Fonctionnalités disponibles :**',
            '',
            '• **Lister / filtrer / trier** les projets (0 DB, tout côté client)',
            '• **Créer** un projet (persistance via API)',
            '• **Modifier en batch** avec confirmation obligatoire :',
            '  - Progression (%), statut, deadline, collab, style, labels',
            '  - Scope intelligent (dernier listing / filtre explicite)',
            '  - Sécurité : idempotency + optimistic concurrency',
            '• **Ajouter une note** avec confirmation',
            '',
            '**Limitations contractuelles :**',
            '',
            '• Je ne pilote **pas** Ableton, Logic, Pro Tools, ou autres DAW',
            '• Je ne pilote **pas** Spotify, Apple Music, ou autres plateformes',
            '• Je ne pilote **pas** Trello, Asana, ou autres outils externes',
            '• Je gère uniquement les projets musicaux dans cette application',
          ].join('\n'),
          requestId,
        };
      }
    }

    console.log('[Router] 🧠 Routing vers Groq (question généraliste)');

    // Utiliser isComplex de la classification pour le routing de modèle
    const isComplex = classification.isComplex || false;

    // Calculer isFirstAssistantTurn: vrai si pas d'historique conversationnel
    const isFirstAssistantTurn = !conversationHistory || conversationHistory.length === 0;

    const response = await callGroqApi(
      userMessage,
      {
        projectCount,
        collabCount: availableCollabs.length,
        styleCount: availableStyles.length,
      },
      conversationHistory,
      requestId,
      isComplex,
      isFirstAssistantTurn
    );

    return {
      type: ProjectCommandType.GENERAL,
      response,
      requestId,
    };
  }

  // ========================================
  // ROUTING : Listing (0 DB, tout côté client)
  // ========================================
  if (classification.isList || classification.isCount) {
    console.log('[Router] 📋 Routing vers Listing (côté client)');

    // Détecter si un filtre explicite est présent
    const hasExplicitFilter = !isFilterEmpty(filters);

    // Détecter une intention "vue détails" (via classification ou extraction fieldsToShow)
    const isDetailsViewRequested =
      classification.isDetailsViewRequested ||
      (fieldsToShow && fieldsToShow.length > 0 && fieldsToShow.length >= 3);

    // Détecter une demande explicite de "tous les projets"
    const isAllProjectsRequested = classification.isAllProjectsRequested;

    // Calculer le scope selon la mémoire de travail (comme pour UPDATE)
    let scopedProjects: Project[];
    let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
    let effectiveFilter: ProjectFilter;

    if (!hasExplicitFilter && isDetailsViewRequested && !isAllProjectsRequested) {
      // Cas spécial : demande de détails sans filtre explicite et sans "tous les projets"
      // → Utiliser le working set si disponible
      const { lastListedProjectIds, lastAppliedFilter } = context;

      if (lastListedProjectIds && lastListedProjectIds.length > 0) {
        // Priorité 1 : Utiliser les IDs du dernier listing
        console.log(
          '[Router] 📋 LIST sans filtre explicite (vue détails) → scope = last listing (IDs)'
        );
        scopeSource = 'LastListedIds';
        scopedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
        effectiveFilter = {}; // Pas de filtre, on utilise les IDs
      } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
        // Priorité 2 : Utiliser le dernier filtre appliqué
        console.log('[Router] 📋 LIST sans filtre explicite (vue détails) → scope = last filter');
        scopeSource = 'LastAppliedFilter';
        const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
        scopedProjects = filtered;
        effectiveFilter = lastAppliedFilter;
      } else {
        // Fallback : tous les projets (pas de working set disponible)
        console.log(
          '[Router] 📋 LIST sans filtre explicite et sans historique → scope = tous les projets'
        );
        scopeSource = 'AllProjects';
        scopedProjects = projects;
        effectiveFilter = {};
      }
    } else if (hasExplicitFilter || isAllProjectsRequested) {
      // Filtre explicite présent OU demande explicite de "tous les projets" : utiliser le filtre
      console.log(
        `[Router] 📋 LIST avec ${hasExplicitFilter ? 'filtre explicite' : 'demande tous les projets'} → scope = filtre de la commande`
      );
      scopeSource = 'ExplicitFilter';
      effectiveFilter = {
        ...filters,
        // TODO: Détecter sortBy et sortDirection depuis la requête si nécessaire
      };
      const { filtered } = applyProjectFilterAndSort(projects, effectiveFilter);
      scopedProjects = filtered;
    } else {
      // Comportement par défaut : utiliser le filtre (même s'il est vide)
      scopeSource = 'ExplicitFilter';
      effectiveFilter = {
        ...filters,
      };
      const { filtered } = applyProjectFilterAndSort(projects, effectiveFilter);
      scopedProjects = filtered;
    }

    // Si c'est une vue détails, forcer fieldsToShow à "all" (liste complète standardisée)
    const finalFieldsToShow =
      isDetailsViewRequested && !isAllProjectsRequested
        ? [
            'status',
            'progress',
            'collab',
            'releaseDate',
            'deadline',
            'style',
            'label',
            'labelFinal',
          ]
        : fieldsToShow && fieldsToShow.length > 0
          ? fieldsToShow
          : ['progress', 'status', 'deadline'];

    const count = scopedProjects.length;

    // Logs du scope choisi (debug)
    debugLog('router', '🎯 LIST Scope choisi', {
      scopeSource,
      scopeCount: count,
      effectiveFilter: summarizeFilter(effectiveFilter),
      lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
      lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter),
      isDetailsViewRequested,
      isAllProjectsRequested,
      hasExplicitFilter,
    });

    const message =
      classification.isCount && !classification.isList
        ? `Vous avez ${count} projet(s).`
        : count === 0
          ? "Je n'ai trouvé aucun projet correspondant."
          : `J'ai trouvé ${count} projet(s).`;

    return {
      type: ProjectCommandType.LIST,
      projects: scopedProjects,
      count,
      fieldsToShow: finalFieldsToShow,
      message,
      appliedFilter: effectiveFilter,
      listedProjectIds: scopedProjects.map((p) => p.id),
      requestId,
    };
  }

  // ========================================
  // ROUTING : Création
  // ========================================
  if (classification.isCreate && !classification.isUpdate) {
    console.log('[Router] ➕ Routing vers Création');

    const createData = extractCreateData(userMessage, lowerQuery, filters as any, availableStyles);

    if (!createData || !createData.name) {
      return {
        type: ProjectCommandType.GENERAL,
        response: "Je n'ai pas pu extraire le nom du projet à créer. Pouvez-vous reformuler ?",
        requestId,
      };
    }

    // La création nécessite un appel serveur pour persister
    // On retourne les données de création qui seront utilisées par le hook
    // pour appeler l'API de création
    return {
      type: ProjectCommandType.CREATE,
      project: {
        // Structure minimale pour indiquer la création
        // Le vrai projet sera créé côté serveur via l'API
        id: 'pending',
        name: createData.name,
        status: (createData.status as any) || 'EN_COURS',
        progress: createData.progress || null,
        collab: createData.collab || null,
        style: createData.style || null,
        deadline: createData.deadline || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
        userId: '',
        label: null,
        labelFinal: null,
        releaseDate: null,
        externalLink: null,
        streamsJ7: null,
        streamsJ14: null,
        streamsJ21: null,
        streamsJ28: null,
        streamsJ56: null,
        streamsJ84: null,
        streamsJ180: null,
        streamsJ365: null,
        note: null,
      } as Project,
      message: `Création du projet "${createData.name}" en cours...`,
      createData, // Inclure les données brutes pour l'API
      requestId,
    };
  }

  // ========================================
  // ROUTING : Modification via filtre (nécessite confirmation)
  // ========================================
  if (classification.isUpdate) {
    console.log('[Router] ✏️ Routing vers Modification (avec confirmation)');

    const updateData = extractUpdateData(userMessage, lowerQuery, filters, availableStyles);

    // Logs pour UPDATE (debug)
    debugLog('router', '📝 ExtractedUpdateData', {
      mutation: {
        newStatus: updateData?.newStatus,
        newProgress: updateData?.newProgress,
        newDeadline: updateData?.newDeadline ? String(updateData.newDeadline) : undefined,
        pushDeadlineBy: updateData?.pushDeadlineBy,
        newCollab: updateData?.newCollab,
        newStyle: updateData?.newStyle,
        newNote: updateData?.newNote,
      },
      extractedFilter: summarizeFilter(filters),
      hasDeadlineIntent: /deadline|date\s*limite/i.test(userMessage),
    });

    if (!updateData) {
      debugLog('router', '❌ UPDATE: extractUpdateData a retourné null');
      return {
        type: ProjectCommandType.GENERAL,
        response:
          "Je n'ai pas pu comprendre quelle modification effectuer. Pouvez-vous reformuler ?",
        requestId,
      };
    }

    // Détecter si un filtre scoping explicite est présent
    // Utiliser isScopingFilter au lieu de isFilterEmpty pour ignorer hasDeadline seul
    const hasExplicitScopingFilter = isScopingFilter(filters);
    const filterSummary = summarizeFilter(filters);
    const filterKeys = Object.keys(filterSummary).filter((k) => k !== 'empty');
    const isFilterEmptyResult = isFilterEmpty(filters);
    const isScopingFilterResult = isScopingFilter(filters);

    let filterReason = '';
    if (isFilterEmptyResult) {
      filterReason = 'filtre vide (toutes les propriétés sont undefined/null/vides)';
    } else if (!isScopingFilterResult && filters.hasDeadline !== undefined) {
      filterReason = 'seulement hasDeadline (qualifier de mutation, pas filtre scoping)';
    } else {
      filterReason = `filtre contient: ${filterKeys.join(', ')}`;
    }

    debugLog('router', '🔍 HasExplicitScopingFilter', {
      hasExplicitScopingFilter,
      isFilterEmpty: isFilterEmptyResult,
      isScopingFilter: isScopingFilterResult,
      reason: hasExplicitScopingFilter
        ? `filtre scoping explicite: ${filterReason}`
        : `pas de filtre scoping explicite: ${filterReason}`,
      filterSummary: summarizeFilter(filters),
    });

    // Calculer les projets impactés selon la mémoire de travail
    let affectedProjects: Project[];
    let effectiveFilters: QueryFilters;
    let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';

    if (!hasExplicitScopingFilter) {
      // Pas de filtre explicite : utiliser la mémoire de travail
      const { lastListedProjectIds, lastAppliedFilter } = context;

      if (lastListedProjectIds && lastListedProjectIds.length > 0) {
        // Priorité 1 : Utiliser les IDs du dernier listing
        console.log('[Router] ✏️ UPDATE sans filtre explicite → scope = last listing (IDs)');
        scopeSource = 'LastListedIds';
        affectedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
        effectiveFilters = {}; // Pas de filtre, on utilise les IDs
      } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
        // Priorité 2 : Utiliser le dernier filtre appliqué
        console.log('[Router] ✏️ UPDATE sans filtre explicite → scope = last filter');
        scopeSource = 'LastAppliedFilter';
        const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
        affectedProjects = filtered;
        effectiveFilters = lastAppliedFilter;
      } else {
        // GARDE-FOU : Pas de scope récent, demander confirmation explicite au lieu de fallback automatique
        // Construire un résumé détaillé pour le warning
        const mutationSummary = {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        };

        // Sanitizer les données avant de logger
        const sanitizedLogData = sanitizeObjectForLogs({
          userMessage: userMessage,
          lastListedProjectIdsCount: lastListedProjectIds?.length || 0,
          projectsCount: projects.length,
          hasLastAppliedFilter: !!lastAppliedFilter,
          lastAppliedFilterSummary: summarizeFilter(lastAppliedFilter || {}),
          mutationSummary,
        });

        console.warn('[Router] ⚠️ GARDE-FOU: Pas de scope récent pour mutation', sanitizedLogData);

        // Demander confirmation explicite au lieu de fallback automatique
        const mutationDescription = buildActionDescription(
          ProjectCommandType.UPDATE,
          {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined, // Convert null to undefined
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          projects.length,
          0
        );

        return {
          type: ProjectCommandType.GENERAL,
          confirmationType: 'scope_missing' as const,
          response: `Je n'ai pas de scope récent (aucun projet listé précédemment). Tu veux appliquer cette modification à tous les projets ?\n\n${mutationDescription}`,
          proposedMutation: {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined,
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          totalProjectsCount: projects.length,
          requestId,
        };
      }
    } else {
      // Filtre scoping explicite présent : l'utiliser (ignore le working set)
      console.log(
        '[Router] ✏️ UPDATE avec filtre scoping explicite → scope = filtre de la commande'
      );
      scopeSource = 'ExplicitFilter';
      affectedProjects = calculateAffectedProjects(projects, filters);
      effectiveFilters = filters;
    }

    // ========================================
    // GARDE-FOU : Vérifier la cohérence du scope choisi
    // ========================================
    // Si scopeSource === LastListedIds mais qu'il n'y a pas d'IDs ou de projets affectés,
    // demander confirmation explicite à l'utilisateur au lieu de fallback automatique
    if (scopeSource === 'LastListedIds') {
      const { lastListedProjectIds } = context;
      if (
        !lastListedProjectIds ||
        lastListedProjectIds.length === 0 ||
        affectedProjects.length === 0
      ) {
        // Construire un résumé détaillé pour le warning
        const mutationSummary = {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        };

        // Sanitizer les données avant de logger
        const sanitizedGuardrailLogData = sanitizeObjectForLogs({
          userMessage: userMessage,
          lastListedProjectIdsCount: lastListedProjectIds?.length || 0,
          projectsCount: projects.length,
          affectedProjectsLength: affectedProjects.length,
          mutationSummary,
          context: {
            hasLastAppliedFilter: !!context.lastAppliedFilter,
            lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter || {}),
          },
        });

        console.warn(
          '[Router] ⚠️ GARDE-FOU: LastListedIds choisi mais lastListedProjectIds est vide ou aucun projet trouvé',
          sanitizedGuardrailLogData
        );

        // Au lieu de fallback automatique, demander confirmation explicite
        const mutationDescription = buildActionDescription(
          ProjectCommandType.UPDATE,
          {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined, // Convert null to undefined
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          projects.length,
          0
        );

        return {
          type: ProjectCommandType.GENERAL,
          confirmationType: 'scope_missing' as const,
          response: `Je n'ai pas de scope récent (aucun projet listé précédemment). Tu veux appliquer cette modification à tous les projets ?\n\n${mutationDescription}`,
          proposedMutation: {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined,
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          totalProjectsCount: projects.length,
          requestId,
        };
      }
    }

    // Logs du scope choisi (debug)
    debugLog('router', '🎯 Scope choisi', {
      scopeSource,
      scopeCount: affectedProjects.length,
      effectiveFilter: summarizeFilter(effectiveFilters),
      lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
      lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter),
    });

    // Pour les mutations de deadline (pushDeadlineBy ou newDeadline), filtrer les projets sans deadline
    const isDeadlineMutation = !!(updateData.pushDeadlineBy || updateData.newDeadline);
    let skippedNoDeadlineCount = 0;
    if (isDeadlineMutation) {
      const beforeCount = affectedProjects.length;
      affectedProjects = affectedProjects.filter(
        (p) => p.deadline !== null && p.deadline !== undefined
      );
      skippedNoDeadlineCount = beforeCount - affectedProjects.length;
      if (skippedNoDeadlineCount > 0) {
        debugLog('router', '⏭️ SkippedNoDeadline', {
          skippedCount: skippedNoDeadlineCount,
          beforeCount,
          afterCount: affectedProjects.length,
        });
      }
    }

    if (affectedProjects.length === 0) {
      // Cas spécial : Si on arrive ici avec aucun projet trouvé et qu'il n'y a pas de scope récent,
      // demander clarification à l'utilisateur.
      // Note: scopeSource ne peut pas être 'AllProjects' ici car le garde-fou retourne déjà dans ce cas
      if (!context.lastListedProjectIds || context.lastListedProjectIds.length === 0) {
        // Construire un résumé détaillé pour le warning
        const mutationSummary = {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        };

        // Sanitizer les données avant de logger
        const sanitizedEdgeCaseLogData = sanitizeObjectForLogs({
          userMessage: userMessage,
          scopeSource,
          lastListedProjectIdsCount: 0,
          projectsCount: projects.length,
          mutationSummary,
          effectiveFilter: summarizeFilter(effectiveFilters),
        });

        console.warn(
          '[Router] ⚠️ Aucun projet trouvé - pas de scope récent',
          sanitizedEdgeCaseLogData
        );

        // Le garde-fou a fait un fallback mais il n'y a toujours aucun projet
        // (peut arriver si projects.length === 0, ce qui est un cas edge)
        const errorMessage =
          projects.length === 0
            ? "Je n'ai trouvé aucun projet. Pouvez-vous préciser quels projets vous souhaitez modifier ?"
            : "Je n'ai pas pu identifier quels projets modifier. Pouvez-vous préciser ? (ex: 'pour les terminés', 'pour les projets en cours')";

        return {
          type: ProjectCommandType.GENERAL,
          response: errorMessage,
          requestId,
        };
      }

      // Construire un résumé détaillé pour le warning
      const mutationSummary = {
        newProgress: updateData.newProgress,
        newStatus: updateData.newStatus,
        newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
        pushDeadlineBy: updateData.pushDeadlineBy,
        newCollab: updateData.newCollab,
        newStyle: updateData.newStyle,
        newLabel: updateData.newLabel,
        newLabelFinal: updateData.newLabelFinal,
        newNote: updateData.newNote,
      };

      // Logs détaillés pour comprendre pourquoi aucun match (debug) - Sanitizer les données
      const sanitizedDebugData = sanitizeObjectForLogs({
        userMessage: userMessage,
        scopeSource,
        effectiveFilter: summarizeFilter(effectiveFilters),
        totalProjects: projects.length,
        lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
        mutationSummary,
        sampleProjects: projects.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
        })),
      });

      debugLog('router', '❌ WhyNoMatch', sanitizedDebugData);

      // Warning détaillé pour production - Sanitizer les données
      const sanitizedNoMatchLogData = sanitizeObjectForLogs({
        userMessage: userMessage,
        scopeSource,
        lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
        projectsCount: projects.length,
        mutationSummary,
        effectiveFilter: summarizeFilter(effectiveFilters),
      });

      console.warn('[Router] ⚠️ Aucun projet trouvé pour mutation', sanitizedNoMatchLogData);

      // Message d'erreur avec détails en mode debug
      const effectiveFilterSummary = summarizeFilter(effectiveFilters);
      const errorMessage = isAssistantDebugEnabled()
        ? `Aucun projet ne correspond aux critères spécifiés.\n\n[Debug] Scope: ${scopeSource}, Filtre: ${JSON.stringify(effectiveFilterSummary)}, Total projets: ${projects.length}`
        : 'Aucun projet ne correspond aux critères spécifiés.';

      return {
        type: ProjectCommandType.GENERAL,
        response: errorMessage,
        requestId,
      };
    }

    // Construire la mutation
    const mutation: ProjectMutation = {
      newStatus: updateData.newStatus,
      newDeadline: updateData.newDeadline || undefined,
      pushDeadlineBy: updateData.pushDeadlineBy,
      newProgress: updateData.newProgress,
      newCollab: updateData.newCollab,
      newStyle: updateData.newStyle,
      newLabel: updateData.newLabel,
      newLabelFinal: updateData.newLabelFinal,
      newNote: updateData.newNote,
      projectName: updateData.projectName,
    };

    // Détecter si c'est une note (projet spécifique ou via filtre)
    const isNoteAction = !!(
      mutation.newNote &&
      (mutation.projectName || affectedProjects.length > 0)
    );

    const actionType = isNoteAction ? ProjectCommandType.ADD_NOTE : ProjectCommandType.UPDATE;

    // Utiliser les champs du dernier listing si disponibles, sinon par défaut
    const fieldsToShowForConfirmation = fieldsToShow || ['progress', 'status', 'deadline'];

    // Générer previewDiff pour les 3 premiers projets
    const previewDiff: import('./types').ProjectPreviewDiff[] = affectedProjects
      .slice(0, 3)
      .map((project) => generateProjectPreviewDiff(project, mutation));

    // Construire expectedUpdatedAtById pour vérification concurrency optimiste
    // Seulement si on a des projets avec updatedAt valide
    const expectedUpdatedAtById: Record<string, string> = {};
    for (const project of affectedProjects) {
      if (project.updatedAt) {
        // Convertir en ISO string (gérer Date ou string)
        const updatedAt =
          project.updatedAt instanceof Date
            ? project.updatedAt.toISOString()
            : typeof project.updatedAt === 'string'
              ? project.updatedAt
              : new Date(project.updatedAt).toISOString();
        expectedUpdatedAtById[project.id] = updatedAt;
      }
      // Si updatedAt est null/undefined, on ne l'inclut pas (sera considéré comme conflit côté serveur)
    }

    const pendingAction: PendingConfirmationAction = {
      actionId: generateActionId(),
      type: actionType,
      filters: effectiveFilters,
      mutation,
      affectedProjects,
      affectedProjectIds: Array.from(new Set(affectedProjects.map((p) => p.id))), // Dédoublonnage en défense en profondeur
      scopeSource,
      fieldsToShow: fieldsToShowForConfirmation,
      description: buildActionDescription(
        actionType,
        mutation,
        affectedProjects.length,
        skippedNoDeadlineCount
      ),
      requestId,
      previewDiff: previewDiff.length > 0 ? previewDiff : undefined,
      expectedUpdatedAtById:
        Object.keys(expectedUpdatedAtById).length > 0 ? expectedUpdatedAtById : undefined,
    };

    return {
      type: actionType,
      pendingAction,
      message: `${pendingAction.description}. Confirmez-vous cette action ?`,
      requestId,
    };
  }

  // ========================================
  // FALLBACK : Question généraliste
  // ========================================
  console.log('[Router] 🤖 Fallback vers Groq');

  // Utiliser isComplex de la classification pour le routing de modèle
  const isComplex = classification.isComplex || false;

  // Calculer isFirstAssistantTurn: vrai si pas d'historique conversationnel
  const isFirstAssistantTurn = !conversationHistory || conversationHistory.length === 0;

  const response = await callGroqApi(
    userMessage,
    {
      projectCount,
      collabCount: availableCollabs.length,
      styleCount: availableStyles.length,
    },
    conversationHistory,
    requestId,
    isComplex,
    isFirstAssistantTurn
  );

  return {
    type: ProjectCommandType.GENERAL,
    response,
    requestId,
  };
}
