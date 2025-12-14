/**
 * Utilitaires de debug pour l'assistant
 * Les logs sont conditionnels et activables via localStorage ou variable d'environnement
 */

/**
 * Vérifie si le mode debug est activé
 * Priorité : localStorage > variable d'environnement > false
 */
export function isAssistantDebugEnabled(): boolean {
  // Vérifier localStorage (côté client uniquement)
  if (typeof window !== 'undefined') {
    const debugFlag = localStorage.getItem('assistant-debug');
    if (debugFlag === 'true' || debugFlag === '1') {
      return true;
    }
    if (debugFlag === 'false' || debugFlag === '0') {
      return false;
    }
  }

  // Vérifier variable d'environnement (côté serveur ou build)
  if (process.env.ASSISTANT_DEBUG === 'true' || process.env.ASSISTANT_DEBUG === '1') {
    return true;
  }

  return false;
}

/**
 * Log conditionnel pour l'assistant
 * @param category - Catégorie du log (ex: 'router', 'hook', 'parser')
 * @param message - Message principal
 * @param data - Données supplémentaires à logger
 */
export function debugLog(category: string, message: string, data?: unknown): void {
  if (!isAssistantDebugEnabled()) {
    return;
  }

  const prefix = `[Assistant Debug:${category}]`;
  if (data !== undefined) {
    console.warn(prefix, message, data);
  } else {
    console.warn(prefix, message);
  }
}

/**
 * Log conditionnel avec formatage spécial pour les objets complexes
 */
export function debugLogObject(category: string, message: string, obj: unknown): void {
  if (!isAssistantDebugEnabled()) {
    return;
  }

  const prefix = `[Assistant Debug:${category}]`;
  console.warn(prefix, message);
  console.warn(prefix, '→', JSON.stringify(obj, null, 2));
}
