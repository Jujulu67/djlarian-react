/**
 * Traduction des erreurs de scraping SoundCloud en erreurs explicites
 */

/**
 * Retourne l'erreur à propager pour un échec de scraping :
 * - timeout : erreur explicite avec le nom du profil
 * - lancement de Chromium : erreur explicite de configuration
 * - autre : l'erreur originale, inchangée
 */
export function toScrapeError(error: unknown, profileName: string): unknown {
  // Si c'est une erreur de timeout, lever une erreur explicite
  if (
    error instanceof Error &&
    (error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.message.includes('Navigation timeout'))
  ) {
    return new Error(
      `Timeout lors du scraping SoundCloud pour ${profileName}. Le scraping a pris trop de temps.`
    );
  }

  // Si c'est une erreur de lancement de Chromium, lever une erreur explicite
  if (
    error instanceof Error &&
    (error.message.includes('Chromium') ||
      error.message.includes('executable') ||
      error.message.includes('launch'))
  ) {
    return new Error(
      `Erreur lors du lancement de Chromium: ${error.message}. Vérifiez la configuration de Puppeteer sur Vercel.`
    );
  }

  // Pour les autres erreurs, propager l'erreur originale
  return error;
}
