/**
 * Valide qu'une chaîne est une URL valide
 * @param url - URL à valider
 * @param allowEmpty - Si true, permet les chaînes vides ou null (défaut: true)
 * @returns true si valide, false sinon
 */
export function isValidUrl(url: string | null | undefined, allowEmpty: boolean = true): boolean {
  // Permettre null/undefined/vide si allowEmpty est true
  if (allowEmpty && (!url || url.trim() === '')) {
    return true;
  }

  // Si on n'autorise pas le vide et que c'est vide, c'est invalide
  if (!allowEmpty && (!url || url.trim() === '')) {
    return false;
  }

  try {
    const urlObj = new URL(url!);
    // Vérifier que le protocole est http ou https pour la sécurité
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitise une URL en s'assurant qu'elle est valide
 * @param url - URL à sanitizer
 * @returns URL sanitizée ou null si invalide
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') {
    return null;
  }

  const trimmed = url.trim();

  // Si l'URL est valide, la retourner
  if (isValidUrl(trimmed, false)) {
    return trimmed;
  }

  // Si l'URL ne commence pas par http:// ou https://, essayer d'ajouter https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const withProtocol = `https://${trimmed}`;
    if (isValidUrl(withProtocol, false)) {
      return withProtocol;
    }
  }

  // Si toujours invalide, retourner null
  return null;
}
