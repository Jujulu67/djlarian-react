/**
 * Wrapper pour la version OLD de l'assistant
 *
 * Ce fichier adapte la version monolithique pour qu'elle fonctionne
 * avec les imports actuels du projet.
 *
 * IMPORTANT: Ce fichier ne doit PAS être modifié pour "corriger" l'OLD.
 * Il sert uniquement d'adaptateur pour permettre l'exécution de l'ancienne version.
 */

'use server';

// Réexporter la fonction depuis le fichier OLD
// On va utiliser un import dynamique pour éviter les problèmes de compilation
// au moment du build si les dépendances OLD ne sont pas compatibles

/**
 * Adapter pour processProjectCommand de la version OLD
 *
 * Cette fonction charge dynamiquement la version OLD et l'exécute.
 * Si la version OLD ne peut pas être chargée (erreurs de compilation, etc.),
 * elle retourne une erreur explicite.
 */
export async function processProjectCommandOLD(userInput: string): Promise<string> {
  try {
    // Import dynamique pour éviter les erreurs de compilation si l'OLD a des problèmes
    // On utilise un chemin relatif depuis OLD/
    const oldAssistant = await import('../OLD/src/app/actions/assistant');

    if (oldAssistant.processProjectCommand) {
      return await oldAssistant.processProjectCommand(userInput);
    }

    return "Erreur : La version OLD de l'assistant n'est pas disponible.";
  } catch (error) {
    console.error('[OLD Assistant] Erreur lors du chargement:', error);

    if (error instanceof Error) {
      return `Erreur lors du chargement de la version OLD : ${error.message}`;
    }

    return "Erreur : Impossible de charger la version OLD de l'assistant.";
  }
}
