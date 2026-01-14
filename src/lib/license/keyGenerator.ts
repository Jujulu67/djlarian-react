import crypto from 'crypto';

/**
 * Génère une clé de licence au format LARIAN-XXXX-XXXX-XXXX
 * Utilise des caractères alphanumériques majuscules (pas de 0/O, 1/I pour éviter confusion)
 */
export function generateLicenseKey(): string {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans 0,O,1,I

  const generateSegment = (length: number): string => {
    let segment = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      segment += CHARSET[randomBytes[i] % CHARSET.length];
    }
    return segment;
  };

  return `LARIAN-${generateSegment(4)}-${generateSegment(4)}-${generateSegment(4)}`;
}

/**
 * Valide le format d'une clé de licence
 */
export function isValidKeyFormat(key: string): boolean {
  return /^LARIAN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
}
