/**
 * Handler pour les questions sur les fonctionnalités de l'assistant
 */

import { ProjectCommandType, type ProjectCommandResult } from './types';

/**
 * Vérifie si c'est une question sur les fonctionnalités de l'assistant
 */
export function isCapabilitiesQuestion(normalizedMessage: string): boolean {
  // Sécurité absolue: si on détecte des signaux de mutation, NE JAMAIS intercepter
  const hasMutationSignals =
    /(\d+%|pourcent|progression|avancement|deadline|date\s*limite|échéance|statut|status|note|label|collab|style|collaborateur|termin[ée]|annul[ée]|en\s*cours)/i.test(
      normalizedMessage
    );

  if (hasMutationSignals) {
    return false;
  }

  // Patterns explicites pour questions sur capacités (pas de commandes)
  const isExplicitCapabilitiesQuestion =
    // Questions directes sur les capacités (début de phrase)
    /^(quelles? sont (tes|vos) (fonctionnalit|capacit)|que (peux|sais)[- ]tu faire|quelles? (sont|tes) (fonctionnalit|capacit)|(dis|dit)[- ]moi (ce que|quelles) (tu peux|tes)|(liste|décris) (tes|vos) (fonctionnalit|capacit))/i.test(
      normalizedMessage
    ) ||
    // Questions avec "capabilités" ou "fonctionnalités" seules (mot-clé principal)
    /^(fonctionnalit|capacit)\s*[?]?$/i.test(normalizedMessage) ||
    // Questions avec "tu peux faire quoi" / "que sais-tu faire" (variantes)
    /^(tu peux faire quoi|que sais[- ]tu faire)\s*[?]?$/i.test(normalizedMessage) ||
    // Questions avec "capabilités" ou "fonctionnalités" en contexte de question (mais pas commande)
    (/(fonctionnalit|capacit|que (peux|sais)[- ]tu|tu peux faire quoi)/i.test(normalizedMessage) &&
      // Mais PAS si c'est une commande (contient des verbes d'action + projet/objet)
      !/(passer|mettre|modifier|ajouter|créer|faire) (leur|les|un|une|des|le|la)/i.test(
        normalizedMessage
      ));

  return isExplicitCapabilitiesQuestion;
}

/**
 * Génère la réponse hardcodée pour les questions sur les fonctionnalités
 */
export function getCapabilitiesResponse(requestId?: string): ProjectCommandResult {
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
