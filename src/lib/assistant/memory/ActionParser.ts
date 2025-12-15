/**
 * ActionParser - Parse et exécute les commandes sans IA
 * Utilise UNIQUEMENT ActionMemory
 */

import { ActionType, ActionResult, ActionContext } from './Types';
import { ActionMemoryStore } from './ActionMemoryStore';

export interface ParsedAction {
  type: ActionType;
  params: Record<string, unknown>;
  rawCommand: string;
}

export type ActionHandler = (action: ParsedAction, context: ActionContext) => Promise<ActionResult>;

export class ActionParser {
  private handlers: Map<ActionType, ActionHandler> = new Map();

  registerHandler(type: ActionType, handler: ActionHandler): void {
    this.handlers.set(type, handler);
  }

  parse(input: string): ParsedAction {
    const normalized = input.trim().toLowerCase();

    // /list ou "liste"
    if (normalized.startsWith('/list') || /^(liste|affiche|montre)/.test(normalized)) {
      return { type: 'LIST', params: this.extractListParams(input), rawCommand: input };
    }

    // /update ou "mets à jour"
    if (normalized.startsWith('/update') || /^(mets? à jour|modifie|change)/.test(normalized)) {
      return { type: 'UPDATE', params: this.extractUpdateParams(input), rawCommand: input };
    }

    // /delete ou "supprime"
    if (normalized.startsWith('/delete') || /^(supprime|efface|enlève)/.test(normalized)) {
      return { type: 'DELETE', params: this.extractDeleteParams(input), rawCommand: input };
    }

    // /status ou "statut"
    if (
      normalized.startsWith('/status') ||
      /^(statut|status|passe en|marque comme)/.test(normalized)
    ) {
      return { type: 'STATUS', params: this.extractStatusParams(input), rawCommand: input };
    }

    // /deadline
    if (normalized.startsWith('/deadline') || /^(deadline|échéance|date limite)/.test(normalized)) {
      return { type: 'DEADLINE', params: this.extractDeadlineParams(input), rawCommand: input };
    }

    // /priority
    if (normalized.startsWith('/priority') || /^(priorité|urgent)/.test(normalized)) {
      return { type: 'PRIORITY', params: this.extractPriorityParams(input), rawCommand: input };
    }

    // /help
    if (normalized.startsWith('/help') || /^(aide|help)/.test(normalized)) {
      return { type: 'HELP', params: {}, rawCommand: input };
    }

    return { type: 'UNKNOWN', params: {}, rawCommand: input };
  }

  async execute(action: ParsedAction, store: ActionMemoryStore): Promise<ActionResult> {
    const handler = this.handlers.get(action.type);
    const context = store.getContext();

    if (!handler) {
      return {
        success: false,
        message: `Action "${action.type}" non supportée`,
        error: 'NO_HANDLER',
      };
    }

    try {
      store.setLastActionType(action.type);
      const result = await handler(action, context);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Erreur: ${errorMsg}`, error: errorMsg };
    }
  }

  // ==========================================================================
  // Param Extractors
  // ==========================================================================

  private extractListParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (/en cours|in_progress/i.test(input)) params.status = 'in_progress';
    if (/terminé|done|completed/i.test(input)) params.status = 'done';
    if (/urgent|high/i.test(input)) params.priority = 'high';
    const limitMatch = input.match(/(\d+)\s*(premiers?|derniers?)/i);
    if (limitMatch) params.limit = parseInt(limitMatch[1], 10);
    return params;
  }

  private extractUpdateParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const idMatch = input.match(/\b([a-f0-9]{8,})\b/i);
    if (idMatch) params.targetId = idMatch[1];
    const progressMatch = input.match(/(\d+)\s*%/);
    if (progressMatch) params.progress = parseInt(progressMatch[1], 10);
    return params;
  }

  private extractDeleteParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const idMatch = input.match(/\b([a-f0-9]{8,})\b/i);
    if (idMatch) params.targetId = idMatch[1];
    return params;
  }

  private extractStatusParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (/en cours|in_progress/i.test(input)) params.newStatus = 'in_progress';
    if (/terminé|done|completed/i.test(input)) params.newStatus = 'done';
    if (/todo|à faire/i.test(input)) params.newStatus = 'todo';
    return params;
  }

  private extractDeadlineParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const isoMatch = input.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) params.deadline = isoMatch[0];
    const euMatch = input.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})/);
    if (euMatch) {
      const [, d, m, y] = euMatch;
      const year = y.length === 2 ? `20${y}` : y;
      params.deadline = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return params;
  }

  private extractPriorityParams(input: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (/low|basse/i.test(input)) params.priority = 'low';
    if (/medium|moyenne/i.test(input)) params.priority = 'medium';
    if (/high|haute|urgent/i.test(input)) params.priority = 'high';
    if (/critical|critique/i.test(input)) params.priority = 'critical';
    return params;
  }
}

// ==========================================================================
// Default Handlers
// ==========================================================================

export function createDefaultHandlers(): Map<ActionType, ActionHandler> {
  const handlers = new Map<ActionType, ActionHandler>();

  handlers.set('LIST', async (action, context) => {
    // Stub: remplacer par appel Prisma réel
    return { success: true, message: 'Liste récupérée', data: [], affectedCount: 0 };
  });

  handlers.set('HELP', async () => {
    const helpText = `Commandes disponibles:
/list - Lister les projets
/update <id> - Mettre à jour
/delete <id> - Supprimer
/status <status> - Changer le statut
/deadline <date> - Définir la deadline
/priority <level> - Définir la priorité`;
    return { success: true, message: helpText };
  });

  handlers.set('UPDATE', async (action) => {
    return { success: true, message: `Mise à jour avec params: ${JSON.stringify(action.params)}` };
  });

  handlers.set('DELETE', async () => {
    return {
      success: false,
      message: 'Suppression nécessite confirmation',
      error: 'NEEDS_CONFIRMATION',
    };
  });

  handlers.set('STATUS', async (action) => {
    return { success: true, message: `Statut changé en: ${action.params.newStatus}` };
  });

  handlers.set('DEADLINE', async (action) => {
    return { success: true, message: `Deadline définie: ${action.params.deadline}` };
  });

  handlers.set('PRIORITY', async (action) => {
    return { success: true, message: `Priorité définie: ${action.params.priority}` };
  });

  return handlers;
}

export function getActionParser(): ActionParser {
  const parser = new ActionParser();
  const defaultHandlers = createDefaultHandlers();
  defaultHandlers.forEach((handler, type) => {
    parser.registerHandler(type, handler);
  });
  return parser;
}
