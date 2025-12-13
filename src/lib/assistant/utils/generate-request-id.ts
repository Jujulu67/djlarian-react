/**
 * Génère un ID de corrélation unique pour une requête assistant
 * Format: AssistantRequest-<timestamp>-<counter>
 *
 * Permet de tracer une requête de bout en bout : message utilisateur → routeur → confirmation → API → logs
 */

let requestCounter = 0;

/**
 * Génère un ID de corrélation unique pour une requête assistant
 * @returns ID au format "AssistantRequest-<timestamp>-<counter>"
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  requestCounter += 1;
  return `AssistantRequest-${timestamp}-${requestCounter}`;
}

/**
 * Réinitialise le compteur (utile pour les tests)
 */
export function resetRequestIdCounter(): void {
  requestCounter = 0;
}
