/**
 * Factory pour obtenir l'implémentation de l'assistant
 *
 * Cette factory retourne l'implémentation de l'assistant (version refactorée).
 */

import type { IAssistantService } from './interface';
import { processProjectCommand as processProjectCommandNEW } from '@/app/actions/assistant';

/**
 * Implémentation de l'assistant (version refactorée)
 */
class AssistantService implements IAssistantService {
  async processProjectCommand(userInput: string): Promise<string> {
    return await processProjectCommandNEW(userInput);
  }
}

/**
 * Cache de l'instance de service pour éviter de la recréer à chaque appel
 */
let cachedService: IAssistantService | null = null;

/**
 * Obtient l'instance du service assistant
 *
 * @returns L'instance du service assistant
 */
export function getAssistantService(): IAssistantService {
  if (!cachedService) {
    cachedService = new AssistantService();
  }
  return cachedService;
}

/**
 * Réinitialise le cache (utile pour forcer la re-création)
 */
export function resetAssistantServiceCache(): void {
  cachedService = null;
}
