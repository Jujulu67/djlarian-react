/**
 * Factory pour obtenir l'implémentation de l'assistant (OLD ou NEW)
 *
 * Ce factory permet de basculer entre la version monolithique (OLD)
 * et la version refactorée (NEW) sans modifier le code appelant.
 */

import type { IAssistantService } from './interface';
import { getAssistantVersion } from './version-selector';
import { processProjectCommand as processProjectCommandNEW } from '@/app/actions/assistant';

/**
 * Implémentation NEW (version refactorée)
 */
class NewAssistantService implements IAssistantService {
  async processProjectCommand(userInput: string): Promise<string> {
    return await processProjectCommandNEW(userInput);
  }
}

/**
 * Implémentation OLD (version monolithique)
 *
 * Utilise l'adapter pour charger la version OLD
 * et éviter les erreurs de compilation si l'OLD a des problèmes
 */
class OldAssistantService implements IAssistantService {
  async processProjectCommand(userInput: string): Promise<string> {
    try {
      // Utiliser l'adapter qui gère les imports OLD
      const { processProjectCommandOLD } = await import('@/app/actions/assistant-old-adapter');
      return await processProjectCommandOLD(userInput);
    } catch (error) {
      console.error('[OldAssistantService] Erreur:', error);

      if (error instanceof Error) {
        // Si c'est une erreur d'import (module non trouvé, etc.), retourner un message clair
        if (
          error.message.includes('Cannot find module') ||
          error.message.includes('Module not found')
        ) {
          return "Erreur : La version OLD de l'assistant n'est pas disponible. Vérifiez que les fichiers OLD/ sont présents.";
        }

        return `Erreur version OLD : ${error.message}`;
      }

      return "Erreur : Impossible d'exécuter la version OLD de l'assistant.";
    }
  }
}

/**
 * Cache des instances de service pour éviter de les recréer à chaque appel
 */
let cachedService: IAssistantService | null = null;
let cachedVersion: 'old' | 'new' | null = null;

/**
 * Obtient l'instance du service assistant selon la version sélectionnée
 *
 * @param forceVersion - Force une version spécifique (optionnel, pour tests)
 * @returns L'instance du service assistant
 */
export function getAssistantService(forceVersion?: 'old' | 'new'): IAssistantService {
  // Sur le serveur, on ne peut pas accéder à localStorage, donc on utilise toujours NEW
  if (typeof window === 'undefined') {
    return new NewAssistantService();
  }

  // Déterminer la version à utiliser
  const version = forceVersion || getAssistantVersion();

  // Si la version n'a pas changé et qu'on a déjà une instance en cache, la réutiliser
  if (cachedService && cachedVersion === version) {
    return cachedService;
  }

  // Créer la nouvelle instance selon la version
  if (version === 'old') {
    cachedService = new OldAssistantService();
  } else {
    cachedService = new NewAssistantService();
  }

  cachedVersion = version;
  return cachedService;
}

/**
 * Réinitialise le cache (utile pour forcer la re-création après changement de version)
 * Cette fonction est appelée quand l'utilisateur change de version dans l'UI
 */
export function resetAssistantServiceCache(): void {
  cachedService = null;
  cachedVersion = null;
}
