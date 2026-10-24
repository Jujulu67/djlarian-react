/**
 * Extraction d'informations depuis les URLs SoundCloud (fonctions pures)
 */

/**
 * Extrait le nom de profil depuis une URL SoundCloud
 * Ex: "https://soundcloud.com/larian" -> "larian"
 * Ex: "soundcloud.com/larian" -> "larian"
 */
export function extractProfileName(profileUrl: string): string | null {
  const match = profileUrl.match(/soundcloud\.com\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Découpe une URL de track "soundcloud.com/<profil>/<slug>"
 * Retourne null si l'URL ne correspond pas à ce format
 */
export function parseTrackUrl(url: string): { profile: string; slug: string } | null {
  const match = url.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
  return match ? { profile: match[1], slug: match[2] } : null;
}
