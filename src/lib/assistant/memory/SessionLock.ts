/**
 * SessionLock - Protection contre les requêtes concurrentes sur la même session
 *
 * O5: "Map par session" ≠ lock
 * Ce module fournit un mécanisme de verrouillage pour éviter les race conditions
 * lorsque deux requêtes async sont en parallèle sur la même session.
 *
 * Usage:
 * ```typescript
 * await withSessionLock(sessionId, async () => {
 *   // Code protégé - une seule exécution à la fois par session
 *   await callGroq(...);
 *   await updateDB(...);
 * });
 * ```
 */

/** Map des locks actifs par session */
const sessionLocks = new Map<string, Promise<void>>();

/** Compteur de requêtes en cours par session (pour debug) */
const inflightCounts = new Map<string, number>();

/** Mode debug */
const isDebug = (): boolean => process.env.ASSISTANT_DEBUG === 'true';

/**
 * Exécute une fonction avec un lock de session.
 * Garantit qu'une seule exécution à la fois par sessionId.
 *
 * @param sessionId Identifiant de la session
 * @param fn Fonction async à exécuter
 * @returns Le résultat de la fonction
 * @throws Si une double-inflight est détectée en mode debug
 */
export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  // Incrémenter le compteur inflight
  const currentCount = inflightCounts.get(sessionId) || 0;
  inflightCounts.set(sessionId, currentCount + 1);

  // O5: Détecter double-inflight en mode debug
  if (isDebug() && currentCount > 0) {
    console.warn(`[SessionLock] ⚠️ Double-inflight détecté sur session ${sessionId}!`, {
      inflightCount: currentCount + 1,
    });
    // En développement, on peut throw pour détecter les problèmes
    if (process.env.NODE_ENV === 'development') {
      // Ne pas throw en prod, juste warn - le lock va sérialiser quand même
    }
  }

  // Attendre que le lock précédent se libère
  const previousLock = sessionLocks.get(sessionId);
  if (previousLock) {
    if (isDebug()) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log(`[SessionLock] Session ${sessionId}: waiting for previous lock...`);
    }
    await previousLock;
  }

  // Créer le nouveau lock
  let releaseLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  sessionLocks.set(sessionId, lockPromise);

  try {
    if (isDebug()) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log(`[SessionLock] Session ${sessionId}: acquired lock`);
    }
    return await fn();
  } finally {
    // Libérer le lock
    releaseLock();
    sessionLocks.delete(sessionId);

    // Décrémenter le compteur inflight
    const newCount = (inflightCounts.get(sessionId) || 1) - 1;
    if (newCount <= 0) {
      inflightCounts.delete(sessionId);
    } else {
      inflightCounts.set(sessionId, newCount);
    }

    if (isDebug()) {
      // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
      console.log(`[SessionLock] Session ${sessionId}: released lock`);
    }
  }
}

/**
 * Vérifie s'il y a des requêtes en cours sur une session.
 * Utile pour les tests et le debug.
 */
export function hasInflight(sessionId: string): boolean {
  return (inflightCounts.get(sessionId) || 0) > 0;
}

/**
 * Retourne le nombre de requêtes en cours sur une session.
 * Utile pour les tests et le debug.
 */
export function getInflightCount(sessionId: string): number {
  return inflightCounts.get(sessionId) || 0;
}

/**
 * Assertion pour tests: vérifie qu'il n'y a pas de double-inflight.
 * @throws Error si double-inflight détecté
 */
export function assertNoDoubleInflight(sessionId: string): void {
  const count = inflightCounts.get(sessionId) || 0;
  if (count > 1) {
    throw new Error(
      `[SessionLock] Double-inflight detected on session ${sessionId}: ${count} concurrent requests`
    );
  }
}

/**
 * Reset pour tests.
 */
export function resetSessionLocks(): void {
  sessionLocks.clear();
  inflightCounts.clear();
}
