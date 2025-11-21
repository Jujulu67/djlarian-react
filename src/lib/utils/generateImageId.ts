/**
 * Génère un ID d'image court et unique
 * Format: timestamp (base36) + random string (6 caractères)
 * Exemple: "l8x3k2-abc123" (beaucoup plus court qu'un UUID)
 */
export function generateImageId(): string {
  // Timestamp en base36 pour le rendre plus court
  const timestamp = Date.now().toString(36);

  // Random string de 6 caractères (alphanumérique)
  const randomStr = Math.random().toString(36).substring(2, 8);

  return `${timestamp}-${randomStr}`;
}

/**
 * Vérifie si un string ressemble à un UUID
 * Utile pour la migration/rétrocompatibilité
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
