/**
 * MessageClassifier
 *
 * Classifie chaque input utilisateur en exactement une décision pour l'architecture mémoire:
 * - GENERAL_CHAT: envoyer à Groq, alimenter ConversationMemory
 * - ACTION_COMMAND: parser sans IA, alimenter ActionMemory
 * - AMBIGUOUS: demander clarification via Groq
 *
 * ⚠️ IMPORTANT (I2 - Un seul routeur):
 * Ce module est un CLASSIFICATEUR pour la mémoire, PAS le routeur de commandes.
 * Le vrai routing (LIST, UPDATE, CREATE, GENERAL) est fait par router/router.ts.
 *
 * Ce module sert UNIQUEMENT à décider si un message va dans:
 * - ConversationMemory (chat)
 * - ActionMemory (action context)
 *
 * Heuristiques déterministes, sans appel IA.
 */

import { ActionType, RouterDecision, RouterResult } from './Types';

// ==========================================================================
// Patterns et configurations
// ==========================================================================

/** Préfixes de commande explicites */
const COMMAND_PREFIXES = [
  '/list',
  '/update',
  '/delete',
  '/add',
  '/note',
  '/help',
  '/status',
  '/deadline',
  '/priority',
  '/tag',
  '/filter',
  '/search',
  '/create',
];

/** Verbes d'action en français */
const ACTION_VERBS_FR = [
  'liste',
  'lister',
  'affiche',
  'afficher',
  'montre',
  'montrer',
  'mets à jour',
  'met à jour',
  'mettre à jour',
  'modifie',
  'modifier',
  'change',
  'changer',
  'update',
  'supprime',
  'supprimer',
  'efface',
  'effacer',
  'enlève',
  'enlever',
  'delete',
  'ajoute',
  'ajouter',
  'crée',
  'créer',
  'nouveau',
  'nouvelle',
  'create',
  'add',
  'note',
  'noter',
  'remarque',
  'deadline',
  'échéance',
  'date limite',
  'date butoir',
  'priorité',
  'prioriser',
  'urgent',
  'priority',
  'tag',
  'tagger',
  'étiquette',
  'étiqueter',
  'label',
  'filtre',
  'filtrer',
  'cherche',
  'chercher',
  'recherche',
  'rechercher',
  'search',
  'find',
  'statut',
  'status',
  'état',
  'passe en',
  'marque comme',
];

/** Verbes d'action en anglais */
const ACTION_VERBS_EN = [
  'list',
  'show',
  'display',
  'get',
  'update',
  'modify',
  'change',
  'edit',
  'set',
  'delete',
  'remove',
  'clear',
  'add',
  'create',
  'new',
  'note',
  'deadline',
  'due',
  'priority',
  'prioritize',
  'tag',
  'label',
  'filter',
  'search',
  'find',
  'status',
  'mark',
];

/** Patterns structurés (IDs, dates, pourcentages) */
const STRUCTURED_PATTERNS = [
  /\b[a-f0-9]{8,}\b/i, // UUID-like IDs
  /\b\d{4}-\d{2}-\d{2}\b/, // Date ISO
  /\b\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}\b/, // Date DD/MM/YYYY
  /\b\d+%\b/, // Pourcentages
  /\b(pending|in_progress|done|completed|todo|cancelled|blocked)\b/i, // Statuts connus
  /\b(low|medium|high|critical|urgent)\b/i, // Priorités
];

/** Mots-clés de small talk */
const SMALL_TALK_KEYWORDS = [
  'bonjour',
  'salut',
  'hello',
  'hi',
  'hey',
  'coucou',
  'ça va',
  'comment vas',
  'how are',
  'quoi de neuf',
  'merci',
  'thanks',
  'thank you',
  'au revoir',
  'bye',
  'à plus',
  'bonne journée',
  'pizza',
  'météo',
  'weather',
  'temps',
  'avis',
  'opinion',
  'penses-tu',
  'think',
  'pourquoi',
  'why',
  'comment',
  'how',
  'explique',
  'explain',
  'aide-moi à comprendre',
  'help me understand',
  "c'est quoi",
  'what is',
  "qu'est-ce que",
  'raconte',
  'tell me about',
  'parle-moi de',
];

/** Confirmations */
const CONFIRMATION_WORDS = [
  'oui',
  'yes',
  'ok',
  'confirme',
  'confirm',
  'go',
  'valide',
  "d'accord",
  'ouais',
  'yep',
  'yup',
];

/** Annulations */
const CANCELLATION_WORDS = ['non', 'no', 'annule', 'cancel', 'stop', 'arrête', 'abort'];

// ==========================================================================
// Router Class
// ==========================================================================

export class Router {
  private readonly debug: boolean;

  constructor(debug = false) {
    this.debug = debug || process.env.ASSISTANT_DEBUG === 'true';
  }

  /**
   * Route un message utilisateur.
   */
  route(input: string, hasPendingConfirmation = false): RouterResult {
    const normalized = this.normalize(input);

    this.log(`Routing: "${normalized.substring(0, 50)}..."`);

    // Priorité 1: Confirmation/Annulation en attente
    if (hasPendingConfirmation) {
      const confirmResult = this.checkConfirmation(normalized);
      if (confirmResult) {
        this.log(`Decision: ${confirmResult.decision} (${confirmResult.reason})`);
        return confirmResult;
      }
    }

    // Priorité 2: Commandes explicites (/list, /update, etc.)
    const commandResult = this.checkExplicitCommand(normalized);
    if (commandResult) {
      this.log(`Decision: ${commandResult.decision} (${commandResult.reason})`);
      return commandResult;
    }

    // Priorité 3: Verbes d'action
    const verbResult = this.checkActionVerbs(normalized);
    if (verbResult) {
      this.log(`Decision: ${verbResult.decision} (${verbResult.reason})`);
      return verbResult;
    }

    // Priorité 4: Patterns structurés (fort indice d'action)
    const structuredResult = this.checkStructuredPatterns(normalized);
    if (structuredResult) {
      this.log(`Decision: ${structuredResult.decision} (${structuredResult.reason})`);
      return structuredResult;
    }

    // Priorité 5: Small talk évident
    const smallTalkResult = this.checkSmallTalk(normalized);
    if (smallTalkResult) {
      this.log(`Decision: ${smallTalkResult.decision} (${smallTalkResult.reason})`);
      return smallTalkResult;
    }

    // Priorité 6: Heuristique par longueur et structure
    const heuristicResult = this.heuristicDecision(normalized);
    this.log(`Decision: ${heuristicResult.decision} (${heuristicResult.reason})`);
    return heuristicResult;
  }

  // ==========================================================================
  // Private: Checks
  // ==========================================================================

  private checkConfirmation(input: string): RouterResult | null {
    const words = input.toLowerCase().split(/\s+/);

    if (words.some((w) => CONFIRMATION_WORDS.includes(w))) {
      return {
        decision: 'ACTION_COMMAND',
        confidence: 0.95,
        reason: 'Confirmation detected for pending action',
        detectedActionType: 'UPDATE', // Sera résolu par le contexte
      };
    }

    if (words.some((w) => CANCELLATION_WORDS.includes(w))) {
      return {
        decision: 'ACTION_COMMAND',
        confidence: 0.95,
        reason: 'Cancellation detected for pending action',
        detectedActionType: 'UNKNOWN',
      };
    }

    return null;
  }

  private checkExplicitCommand(input: string): RouterResult | null {
    for (const prefix of COMMAND_PREFIXES) {
      if (input.startsWith(prefix)) {
        const actionType = this.prefixToActionType(prefix);
        return {
          decision: 'ACTION_COMMAND',
          confidence: 1.0,
          reason: `Explicit command prefix: ${prefix}`,
          detectedActionType: actionType,
        };
      }
    }
    return null;
  }

  private checkActionVerbs(input: string): RouterResult | null {
    const lowerInput = input.toLowerCase();

    // Vérifier les verbes français (multi-mots d'abord)
    for (const verb of ACTION_VERBS_FR.sort((a, b) => b.length - a.length)) {
      if (lowerInput.includes(verb)) {
        // S'assurer que c'est au début ou après un espace/ponctuation
        const regex = new RegExp(`(^|\\s|,|;|:)${this.escapeRegex(verb)}`, 'i');
        if (regex.test(lowerInput)) {
          return {
            decision: 'ACTION_COMMAND',
            confidence: 0.85,
            reason: `Action verb detected: "${verb}"`,
            detectedActionType: this.verbToActionType(verb),
          };
        }
      }
    }

    // Vérifier les verbes anglais
    for (const verb of ACTION_VERBS_EN) {
      const regex = new RegExp(`(^|\\s)${this.escapeRegex(verb)}(\\s|$)`, 'i');
      if (regex.test(lowerInput)) {
        return {
          decision: 'ACTION_COMMAND',
          confidence: 0.85,
          reason: `Action verb detected: "${verb}"`,
          detectedActionType: this.verbToActionType(verb),
        };
      }
    }

    return null;
  }

  private checkStructuredPatterns(input: string): RouterResult | null {
    for (const pattern of STRUCTURED_PATTERNS) {
      if (pattern.test(input)) {
        // Patterns structurés seuls ne suffisent pas, mais augmentent la confiance
        // On les traite comme AMBIGUOUS sauf si combinés avec un verbe
        return {
          decision: 'AMBIGUOUS',
          confidence: 0.6,
          reason: `Structured pattern detected but no clear action verb`,
        };
      }
    }
    return null;
  }

  private checkSmallTalk(input: string): RouterResult | null {
    const lowerInput = input.toLowerCase();
    const words = lowerInput.split(/\s+/);

    // Vérifier les mots-clés de small talk
    let smallTalkScore = 0;
    for (const keyword of SMALL_TALK_KEYWORDS) {
      if (lowerInput.includes(keyword)) {
        smallTalkScore++;
      }
    }

    // Questions générales
    if (/^(comment|pourquoi|qu'est-ce|c'est quoi|what|why|how)\s/i.test(input)) {
      smallTalkScore += 2;
    }

    // Messages courts et conversationnels
    if (words.length <= 5 && smallTalkScore > 0) {
      return {
        decision: 'GENERAL_CHAT',
        confidence: 0.9,
        reason: 'Small talk pattern detected',
      };
    }

    if (smallTalkScore >= 2) {
      return {
        decision: 'GENERAL_CHAT',
        confidence: 0.85,
        reason: 'Multiple small talk keywords detected',
      };
    }

    return null;
  }

  private heuristicDecision(input: string): RouterResult {
    const words = input.split(/\s+/);

    // Messages très courts (1-3 mots) sans verbe d'action → probablement chat
    if (words.length <= 3) {
      return {
        decision: 'GENERAL_CHAT',
        confidence: 0.7,
        reason: 'Short message without clear action intent',
      };
    }

    // Messages avec questions → chat
    if (input.includes('?')) {
      return {
        decision: 'GENERAL_CHAT',
        confidence: 0.75,
        reason: 'Question detected',
      };
    }

    // Messages moyens sans indicateurs clairs → ambigu
    return {
      decision: 'AMBIGUOUS',
      confidence: 0.5,
      reason: 'No clear pattern detected, defaulting to AMBIGUOUS',
    };
  }

  // ==========================================================================
  // Private: Helpers
  // ==========================================================================

  private normalize(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private prefixToActionType(prefix: string): ActionType {
    const map: Record<string, ActionType> = {
      '/list': 'LIST',
      '/update': 'UPDATE',
      '/delete': 'DELETE',
      '/add': 'CREATE',
      '/create': 'CREATE',
      '/note': 'NOTE',
      '/help': 'HELP',
      '/status': 'STATUS',
      '/deadline': 'DEADLINE',
      '/priority': 'PRIORITY',
      '/tag': 'TAG',
      '/filter': 'FILTER',
      '/search': 'SEARCH',
    };
    return map[prefix] || 'UNKNOWN';
  }

  private verbToActionType(verb: string): ActionType {
    const lower = verb.toLowerCase();

    if (
      [
        'liste',
        'lister',
        'affiche',
        'afficher',
        'montre',
        'montrer',
        'list',
        'show',
        'display',
        'get',
      ].includes(lower)
    ) {
      return 'LIST';
    }
    if (
      [
        'mets à jour',
        'met à jour',
        'mettre à jour',
        'modifie',
        'modifier',
        'change',
        'changer',
        'update',
        'modify',
        'edit',
        'set',
      ].includes(lower)
    ) {
      return 'UPDATE';
    }
    if (
      [
        'supprime',
        'supprimer',
        'efface',
        'effacer',
        'enlève',
        'enlever',
        'delete',
        'remove',
        'clear',
      ].includes(lower)
    ) {
      return 'DELETE';
    }
    if (
      [
        'ajoute',
        'ajouter',
        'crée',
        'créer',
        'nouveau',
        'nouvelle',
        'create',
        'add',
        'new',
      ].includes(lower)
    ) {
      return 'CREATE';
    }
    if (['note', 'noter', 'remarque'].includes(lower)) {
      return 'NOTE';
    }
    if (['deadline', 'échéance', 'date limite', 'date butoir', 'due'].includes(lower)) {
      return 'DEADLINE';
    }
    if (['priorité', 'prioriser', 'urgent', 'priority', 'prioritize'].includes(lower)) {
      return 'PRIORITY';
    }
    if (['tag', 'tagger', 'étiquette', 'étiqueter', 'label'].includes(lower)) {
      return 'TAG';
    }
    if (['statut', 'status', 'état', 'passe en', 'marque comme', 'mark'].includes(lower)) {
      return 'STATUS';
    }
    if (
      [
        'filtre',
        'filtrer',
        'cherche',
        'chercher',
        'recherche',
        'rechercher',
        'search',
        'find',
        'filter',
      ].includes(lower)
    ) {
      return 'SEARCH';
    }

    return 'UNKNOWN';
  }

  private log(message: string): void {
    if (this.debug) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log(`[Router] ${message}`);
    }
  }
}

// ==========================================================================
// Singleton Export
// ==========================================================================

let routerInstance: Router | null = null;

export function getRouter(): Router {
  if (!routerInstance) {
    routerInstance = new Router();
  }
  return routerInstance;
}
