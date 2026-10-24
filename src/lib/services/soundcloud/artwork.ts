/**
 * Normalisation des URLs de cover art SoundCloud (fonctions pures)
 */

/**
 * Passe une URL d'image en taille 500x500 et retire la query string
 */
export function normalizeThumbnailUrl(url: string): string {
  return url.replace('-large', '-t500x500').split('?')[0];
}

/**
 * Cherche une URL d'artwork (clé JSON "artwork_url") dans le contenu d'un script embarqué
 * Retourne null si le script ne contient pas d'artwork exploitable
 */
export function extractArtworkUrlFromScript(content: string): string | null {
  if (!(content.includes('artwork_url') || content.includes('artwork'))) {
    return null;
  }

  const artworkMatch = content.match(/"artwork_url"\s*:\s*"([^"]+)"/);
  if (artworkMatch && artworkMatch[1]) {
    return normalizeThumbnailUrl(artworkMatch[1]);
  }

  return null;
}
