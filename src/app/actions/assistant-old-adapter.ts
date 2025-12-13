/**
 * Adapter pour la version OLD de l'assistant
 *
 * Ce fichier sert de pont entre le factory et la version OLD.
 * Il réexporte la fonction processProjectCommand de la version OLD
 * en gérant les imports qui pointent vers les modules OLD.
 *
 * IMPORTANT: Ce fichier ne doit PAS être modifié pour "corriger" l'OLD.
 * Il sert uniquement d'adaptateur.
 */

'use server';

/**
 * Cette fonction charge dynamiquement la version OLD depuis OLD/
 * et l'exécute. Les imports dans OLD/src/app/actions/assistant.ts
 * pointent vers @/lib/assistant/... qui résout vers src/lib/assistant/,
 * donc on doit créer un wrapper qui redirige ces imports vers OLD/.
 *
 * Pour l'instant, on va simplement essayer de charger le fichier OLD
 * et voir si ça fonctionne. Si les imports ne matchent pas, on retournera
 * une erreur explicite.
 */
export async function processProjectCommandOLD(userInput: string): Promise<string> {
  try {
    // Import dynamique avec l'alias @old pour pointer vers OLD/src/
    // Cela évite les problèmes de chemins relatifs avec Next.js
    const oldModule = await import('@old/app/actions/assistant');

    if (oldModule.processProjectCommand && typeof oldModule.processProjectCommand === 'function') {
      return await oldModule.processProjectCommand(userInput);
    }

    return "Erreur : La fonction processProjectCommand n'est pas disponible dans la version OLD.";
  } catch (error) {
    console.error('[OLD Adapter] Erreur lors du chargement de la version OLD:', error);

    if (error instanceof Error) {
      // Si c'est une erreur d'import (module non trouvé, imports manquants, etc.)
      if (
        error.message.includes('Cannot find module') ||
        error.message.includes('Module not found') ||
        error.message.includes('Cannot resolve')
      ) {
        return "Erreur : La version OLD de l'assistant n'est pas disponible. Les fichiers OLD/ sont peut-être manquants ou les imports ne sont pas compatibles.";
      }

      // Autres erreurs (syntaxe, etc.)
      return `Erreur version OLD : ${error.message}`;
    }

    return "Erreur : Impossible de charger la version OLD de l'assistant.";
  }
}
