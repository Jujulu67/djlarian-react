/**
 * Authentification des appels serveur → API interne (côté serveur, pas de cookie de session).
 * Module sans dépendance serveur : importable depuis du code partagé client/serveur.
 */
export const INTERNAL_AUTH_HEADER = 'x-internal-auth';

export function getInternalSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
}

/** En-têtes à joindre aux appels serveur → API interne. Vide côté client. */
export function internalAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const secret = getInternalSecret();
  return secret ? { [INTERNAL_AUTH_HEADER]: secret } : {};
}
