import { randomToken } from '@/lib/utils/random';

/**
 * Génère un ID d'image court et unique
 * Format: timestamp (base36) + random string (6 caractères)
 * Exemple: "l8x3k2-abc123" (beaucoup plus court qu'un UUID)
 */
export function generateImageId(): string {
  // Timestamp en base36 pour le rendre plus court
  const timestamp = Date.now().toString(36);

  // Random string de 6 caractères (alphanumérique)
  const randomStr = randomToken(6);

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

const SHORT_IMAGE_ID = /^[a-z0-9]+-[a-z0-9]+$/i;
const UUID_IMAGE_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Identifiant d'image valide : format court (timestamp-random) ou ancien UUID. */
export function isValidImageId(id: string): boolean {
  return SHORT_IMAGE_ID.test(id) || UUID_IMAGE_ID.test(id);
}
