/**
 * Formate le texte de l'assistant pour améliorer la lisibilité dans l'interface
 * - Ajoute des retours à la ligne après les phrases
 * - Sépare les paragraphes longs
 * - Préserve la structure existante
 * - Gère les emojis et la ponctuation
 */
export function formatAssistantMessage(text: string): string {
  if (!text) return text;

  // Préserver les retours à la ligne existants mais normaliser les espaces multiples
  let formatted = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Si le texte contient déjà des retours à la ligne significatifs, les préserver
  const hasExistingLineBreaks =
    formatted.split('\n').filter((line) => line.trim().length > 0).length > 1;

  if (hasExistingLineBreaks) {
    // Nettoyer les espaces multiples mais préserver la structure
    formatted = formatted
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n\n');
    return formatted;
  }

  // Pour les textes sans retours à la ligne, ajouter des retours après les phrases
  // Remplacer les fins de phrases suivies d'un espace puis d'une majuscule par un retour à la ligne
  // Cela gère aussi les cas avec emojis car ils sont entre la ponctuation et la majuscule suivante
  formatted = formatted.replace(/([.!?])\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ])/g, '$1\n\n$2');

  // Nettoyer les retours à la ligne multiples (max 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Nettoyer les espaces en début/fin de ligne
  formatted = formatted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n');

  return formatted;
}
