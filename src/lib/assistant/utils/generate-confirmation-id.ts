import { randomToken } from '@/lib/utils/random';

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
  const random = randomToken(9);
  return `Confirmation-${timestamp}-${random}`;
}
