/**
 * Génère un ID unique pour une confirmation assistant
 * Format: Confirmation-<timestamp>-<random>
 *
 * Utilisé pour l'idempotency: éviter les doubles mutations en cas de double clic ou retry réseau
 */

/**
 * Génère un ID unique pour une confirmation
 * @returns ID au format "Confirmation-<timestamp>-<random>"
 */
export function generateConfirmationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `Confirmation-${timestamp}-${random}`;
}
