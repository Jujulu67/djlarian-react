/**
 * Gestion de la sélection de version de l'assistant (OLD vs NEW)
 * Utilise localStorage pour persister le choix de l'utilisateur
 */

export type AssistantVersion = 'old' | 'new';

const STORAGE_KEY = 'assistant-version';

/**
 * Récupère la version actuellement sélectionnée
 * Par défaut: 'new' (version refactorée)
 */
export function getAssistantVersion(): AssistantVersion {
  if (typeof window === 'undefined') {
    // Server-side: toujours utiliser NEW par défaut
    return 'new';
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'old' || stored === 'new') {
    return stored;
  }

  return 'new'; // Par défaut: version refactorée
}

/**
 * Définit la version à utiliser
 */
export function setAssistantVersion(version: AssistantVersion): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, version);
}

/**
 * Réinitialise la version à la valeur par défaut (NEW)
 */
export function resetAssistantVersion(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
