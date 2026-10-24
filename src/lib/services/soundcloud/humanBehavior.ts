/**
 * Temporisations « humaines » pour le scraping SoundCloud (délais aléatoires)
 */

/**
 * Retourne base + un entier aléatoire dans [0, range)
 */
export function jitter(base: number, range: number): number {
  return base + Math.floor(Math.random() * range);
}

/**
 * Attend ms millisecondes
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
