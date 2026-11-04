/**
 * Longueur maximale d'un message envoyé à l'assistant. Le parseur applique des dizaines
 * d'expressions régulières côté serveur, dont certaines ont un coût super-linéaire : sans
 * plafond, un texte très long peut bloquer le serveur (ReDoS).
 */
export const MAX_ASSISTANT_INPUT_LENGTH = 2000;

export const ASSISTANT_INPUT_TOO_LONG = `Message trop long (${MAX_ASSISTANT_INPUT_LENGTH} caractères maximum).`;

export function isAssistantInputTooLong(input: unknown): boolean {
  return typeof input === 'string' && input.length > MAX_ASSISTANT_INPUT_LENGTH;
}
