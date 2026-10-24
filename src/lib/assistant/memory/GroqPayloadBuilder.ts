/**
 * GroqPayloadBuilder - Construit le payload pour Groq
 *
 * INVARIANTS GARANTIS:
 * - I1: Utilise UNIQUEMENT ConversationMemory (kind='chat')
 * - Validation anti-pollution avant envoi
 * - Budget tokens avec trimming FIFO (seule source de vérité - I4)
 *
 * LIMITES CONTEXTE (O1 - Clarification modèle vs produit):
 * - ModelContextLimit: Voir ModelLimits.ts pour les valeurs officielles
 * - ProductSoftLimit/ProductHardLimit: choix produit pour UX/perf, pas des limites modèle
 *
 * O6: Limites modèle officielles depuis ModelLimits.ts
 * O7: Feature flag GROQ_SEND_DEPRECATED_MAX_TOKENS pour max_tokens déprécié
 */

import { ChatMessage, GroqMessage, GroqPayload, isChatMessage } from './Types';
import { ConversationMemoryStore } from './ConversationMemoryStore';
import {
  capMaxCompletionTokens,
  getModelContextLimit,
  getModelMaxOutput,
  getBoundedResponseReserve,
  ModelContextTokens,
  ModelMaxOutputTokens,
} from './ModelLimits';

const DEFAULT_MODEL = 'llama-3.1-8b-instant';

/**
 * O7: Feature flag pour envoyer max_tokens (déprécié)
 *
 * - false (default prod): N'envoie PAS max_tokens, utilise uniquement max_completion_tokens
 * - true: Envoie max_tokens en fallback pour compatibilité legacy
 *
 * @see https://console.groq.com/docs/api-reference#chat-create
 */
const SEND_DEPRECATED_MAX_TOKENS = process.env.GROQ_SEND_DEPRECATED_MAX_TOKENS === 'true';

/**
 * DOCUMENTATION: Limites officielles des modèles Groq
 * @see ModelLimits.ts pour la source de vérité
 *
 * Rappel (source: GroqCloud docs):
 * - llama-3.1-8b-instant: context 131072, max output 131072
 * - llama-3.3-70b-versatile: context 131072, max output 32768 (⚠️ limité!)
 */
const MODEL_CONTEXT_LIMITS = ModelContextTokens;

/** Configuration du budget tokens (CHOIX PRODUIT, pas limites modèle) */
interface TokenBudgetConfig {
  /** Début du trimming FIFO - CHOIX PRODUIT pour UX/latence */
  productSoftLimit: number;
  /** Maximum absolu avant rejet - CHOIX PRODUIT pour coût/stabilité */
  productHardLimit: number;
  /** Réserve pour la réponse du modèle */
  reserveForResponse: number;
}

/**
 * LIMITES PRODUIT PAR DÉFAUT (O1)
 * Ces valeurs sont des CHOIX PRODUIT pour optimiser:
 * - Latence des réponses (softLimit bas = réponses plus rapides)
 * - Coût API (limiter les tokens envoyés)
 * - Expérience utilisateur (trimmer les vieux messages)
 *
 * ⚠️ Ce ne sont PAS les limites du modèle (131072 tokens pour llama-3.1-8b-instant)
 * Configurable via variables d'environnement.
 */
const DEFAULT_TOKEN_BUDGET: TokenBudgetConfig = {
  productSoftLimit: parseInt(process.env.GROQ_SOFT_LIMIT || '3000', 10),
  productHardLimit: parseInt(process.env.GROQ_HARD_LIMIT || '8000', 10),
  reserveForResponse: parseInt(process.env.GROQ_RESPONSE_RESERVE || '1024', 10),
};

/**
 * PATTERNS DE POLLUTION - Détection d'outputs d'actions (O3 - Refactored)
 *
 * RÈGLE: Ne PAS filtrer les mots techniques isolés (ex: "Explique Prisma")
 * FILTRER: Les outputs structurés d'actions (JSON, listings, confirmations)
 *
 * La détection est maintenant CONTEXTUELLE:
 * - Messages assistant: filtrage strict (outputs d'actions)
 * - Messages user: filtrage léger (éviter injection de résultats d'actions)
 */

/** Patterns STRICTS pour les outputs d'actions (messages assistant principalement) */
const ACTION_OUTPUT_PATTERNS = [
  // JSON arrays/objects avec structure de données projet
  /\[[\s\S]*\{[\s\S]*"id"[\s\S]*\}[\s\S]*\]/,
  /```json[\s\S]*"(id|name|status)"[\s\S]*```/i,
  // Résultats d'actions avec comptage
  /\d+ projets? (mis à jour|supprimé|créé|listé|trouvé)/i,
  /J'ai (trouvé|mis|supprimé|créé) \d+ projet/i,
  /Ok\.\s*J'ai mis \d+ projet/i,
  // Champs techniques d'output d'actions
  /"affectedRows"\s*:/i,
  /"affectedProjectIds"\s*:\s*\[/i,
  /"pendingAction"\s*:/i,
  /"success"\s*:\s*(true|false),?\s*"(message|data|affectedCount)"/i,
  // Tableaux ASCII de listings
  /\|[-=]+\|[\s\S]*\|[-=]+\|/,
  /^\s*\|\s*ID\s*\|\s*Nom\s*\|/im,
];

/** Patterns LÉGERS pour messages user (éviter injection, mais pas filtrer tech légitimes) */
const USER_INJECTION_PATTERNS = [
  // Tentatives d'injection de résultats JSON
  /^\s*\[\s*\{[\s\S]*"id"[\s\S]*\}\s*\]\s*$/,
  // Blocs code JSON purs (pas discussions sur JSON)
  /^```json\s*\[[\s\S]*\]```$/im,
];

// Legacy export pour compatibilité - NE PAS UTILISER DIRECTEMENT
const POLLUTION_PATTERNS = ACTION_OUTPUT_PATTERNS;

interface GroqPayloadBuilderOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
  tokenBudget?: Partial<TokenBudgetConfig>;
}

const BASE_SYSTEM_PROMPT = `Tu es LARIAN, un assistant IA. Réponds en français, sois concis.`;

export class GroqPayloadBuilder {
  private readonly options: Required<Omit<GroqPayloadBuilderOptions, 'tokenBudget'>>;
  private readonly tokenBudget: TokenBudgetConfig;
  private readonly debug: boolean;

  constructor(options: GroqPayloadBuilderOptions = {}) {
    this.options = {
      model: options.model ?? DEFAULT_MODEL,
      maxTokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      systemPrompt: options.systemPrompt ?? BASE_SYSTEM_PROMPT,
      stream: options.stream ?? false,
    };
    this.tokenBudget = {
      ...DEFAULT_TOKEN_BUDGET,
      ...options.tokenBudget,
    };
    this.debug = process.env.ASSISTANT_DEBUG === 'true';
  }

  /**
   * Construit le payload Groq depuis ConversationMemoryStore.
   * INVARIANT I1: N'accepte QUE des ChatMessage (kind='chat')
   */
  build(store: ConversationMemoryStore, currentUserMessage?: string): GroqPayload {
    const messages: GroqMessage[] = [];

    // System prompt (toujours en premier)
    messages.push({ role: 'system', content: this.options.systemPrompt });

    // Messages validés depuis le store
    let totalTokens = this.estimateTokens(this.options.systemPrompt);

    const storeMessages = store.getMessages();
    const validMessages: GroqMessage[] = [];

    for (const msg of storeMessages) {
      // INVARIANT I1: Vérification stricte kind='chat'
      if (!isChatMessage(msg)) {
        this.logViolation(`Non-chat message rejected: kind=${(msg as { kind?: string }).kind}`);
        continue;
      }

      // Vérification anti-pollution
      if (this.looksLikeActionOutput(msg.content)) {
        this.logViolation(`Polluted content rejected: ${msg.content.substring(0, 50)}...`);
        continue;
      }

      validMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Calculer tokens totaux
    for (const msg of validMessages) {
      totalTokens += this.estimateTokens(msg.content);
    }

    // Trimming FIFO si dépassement du productSoftLimit (O4: seule source de vérité)
    let messagesToInclude = [...validMessages];

    while (totalTokens > this.tokenBudget.productSoftLimit && messagesToInclude.length > 2) {
      const removed = messagesToInclude.shift();
      if (removed) {
        totalTokens -= this.estimateTokens(removed.content);
        this.log(
          `TRIMMED: oldest message removed (budget: ${totalTokens}/${this.tokenBudget.productSoftLimit})`
        );
      }
    }

    messages.push(...messagesToInclude);

    // Message utilisateur courant
    if (currentUserMessage?.trim()) {
      // Validation du message courant aussi
      if (this.looksLikeActionOutput(currentUserMessage)) {
        this.logViolation(`Current user message polluted, skipping`);
      } else {
        messages.push({ role: 'user', content: currentUserMessage.trim() });
      }
    }

    // Log debug sanitisé
    if (this.debug) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log('[GroqPayloadBuilder] Payload built:', {
        messageCount: messages.length,
        estimatedTokens: totalTokens,
        modelId: this.options.model,
        messagesPreview: messages.slice(-3).map((m) => ({
          role: m.role,
          contentLength: m.content.length,
          preview: m.content.substring(0, 30) + '...',
        })),
      });
    }

    // O6: Cap max_completion_tokens selon les limites du modèle
    const cappedMaxTokens = capMaxCompletionTokens(this.options.model, this.options.maxTokens);

    // O7: Feature flag pour max_tokens déprécié
    const payload: GroqPayload = {
      model: this.options.model,
      messages,
      temperature: this.options.temperature,
      max_completion_tokens: cappedMaxTokens,
      stream: this.options.stream,
    };

    // O7: Ajouter max_tokens seulement si feature flag activé
    if (SEND_DEPRECATED_MAX_TOKENS) {
      payload.max_tokens = cappedMaxTokens;
      if (this.debug) {
        console.warn(
          '[GroqPayloadBuilder] ⚠️ DEPRECATED: max_tokens fallback enabled via GROQ_SEND_DEPRECATED_MAX_TOKENS'
        );
      }
    }

    // Debug payload en mode ASSISTANT_DEBUG=true (O2)
    if (this.debug) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log('[GroqPayloadBuilder] 🔍 Payload debug:', {
        model: payload.model,
        messageCount: payload.messages.length,
        max_completion_tokens: payload.max_completion_tokens,
        max_tokens_included: SEND_DEPRECATED_MAX_TOKENS,
        cappedFrom: this.options.maxTokens !== cappedMaxTokens ? this.options.maxTokens : undefined,
        temperature: payload.temperature,
        estimatedInputTokens: totalTokens,
        modelContextLimit: MODEL_CONTEXT_LIMITS[this.options.model] || 'unknown',
        modelMaxOutput: getModelMaxOutput(this.options.model),
      });
    }

    return payload;
  }

  /**
   * Construit un payload pour demander une clarification.
   */
  buildClarificationPayload(store: ConversationMemoryStore, ambiguousInput: string): GroqPayload {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: `${this.options.systemPrompt}\n\nDemande une clarification poliment.`,
      },
    ];
    for (const msg of store.getMessages()) {
      if (isChatMessage(msg) && !this.looksLikeActionOutput(msg.content)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: ambiguousInput });

    // O6: Cap selon limites modèle
    const cappedTokens = capMaxCompletionTokens(this.options.model, this.options.maxTokens);

    const payload: GroqPayload = {
      model: this.options.model,
      messages,
      temperature: 0.5,
      max_completion_tokens: cappedTokens,
    };

    // O7: Feature flag pour max_tokens déprécié
    if (SEND_DEPRECATED_MAX_TOKENS) {
      payload.max_tokens = cappedTokens;
    }

    return payload;
  }

  /**
   * Détecte si un texte ressemble à un output d'action (pollution).
   * Public pour permettre les tests et la validation externe.
   *
   * O3: Détection CONTEXTUELLE - ne filtre plus "prisma" ou "sql" isolés.
   * @param text Le texte à vérifier
   * @param role Le rôle de l'auteur du message (assistant = strict, user = léger)
   */
  looksLikeActionOutput(text: string, role: 'user' | 'assistant' = 'assistant'): boolean {
    // O3: Filtrage contextuel
    if (role === 'user') {
      // Pour les messages user, on ne filtre que les injections évidentes
      return USER_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
    }
    // Pour les messages assistant, filtrage strict des outputs d'actions
    return ACTION_OUTPUT_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Valide un payload existant (pour tests/debug).
   */
  validatePayload(payload: GroqPayload): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (let i = 0; i < payload.messages.length; i++) {
      const msg = payload.messages[i];
      if (msg.role !== 'system' && this.looksLikeActionOutput(msg.content)) {
        violations.push(`Message[${i}] contains polluted content`);
      }
    }

    return { valid: violations.length === 0, violations };
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private estimateTokens(content: string): number {
    // Approximation: 4 chars = 1 token pour LLama
    return Math.ceil(content.length / 4);
  }

  private log(message: string): void {
    if (this.debug) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log(`[GroqPayloadBuilder] ${message}`);
    }
  }

  private logViolation(message: string): void {
    const prefix = '[GroqPayloadBuilder] ⚠️ VIOLATION:';
    if (this.debug) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`${prefix} ${message}`);
      } else {
        console.error(`${prefix} ${message}`);
      }
    } else {
      // En prod, log discret
      console.warn(`${prefix} ${message}`);
    }
  }
}

export function getGroqPayloadBuilder(opts?: GroqPayloadBuilderOptions): GroqPayloadBuilder {
  return new GroqPayloadBuilder(opts);
}

/**
 * Fonction utilitaire publique pour détecter la pollution.
 * Utilisée par les tests et le code de validation.
 *
 * O3: Détection contextuelle - ne filtre plus les mots techniques isolés.
 * @param text Le texte à vérifier
 * @param role Le rôle du message (default: 'assistant' pour compatibilité)
 */
export function looksLikeActionOutput(
  text: string,
  role: 'user' | 'assistant' = 'assistant'
): boolean {
  if (role === 'user') {
    return USER_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
  }
  return ACTION_OUTPUT_PATTERNS.some((pattern) => pattern.test(text));
}
