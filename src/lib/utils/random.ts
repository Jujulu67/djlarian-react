/**
 * Aléatoire cryptographique (navigateur et Node) pour les identifiants et les tirages qui
 * donnent des gains. Math.random() reste acceptable pour les animations.
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Chaîne aléatoire de `length` caractères [0-9a-z]. */
export function randomToken(length = 9): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Réel uniforme dans [0, 1), comme Math.random(). */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}
