/**
 * Conversion des données brutes extraites du DOM en SoundCloudTrack
 */

import { detectTrackType, parseSoundCloudTitle } from './parseTitle';
import { parseTrackUrl } from './urls';
import type { RawTrackData, SoundCloudTrack } from './types';

/**
 * Convertit une track brute en SoundCloudTrack
 * (id, embedId, titre/artiste parsés, type ; date du jour si aucune date n'a été extraite)
 *
 * @throws Error si l'URL de la track ne correspond pas au format attendu
 */
export function toSoundCloudTrack(trackData: RawTrackData, profileName: string): SoundCloudTrack {
  const trackMatch = parseTrackUrl(trackData.url);
  if (!trackMatch) {
    throw new Error(`URL invalide: ${trackData.url}`);
  }

  const embedId = `${trackMatch.profile}/${trackMatch.slug}`;
  const trackId = `sc_${trackMatch.profile}_${trackMatch.slug}`.replace(/[^a-z0-9_]/gi, '_');

  // Utiliser la date extraite du DOM, sinon utiliser la date actuelle
  const releaseDate = trackData.releaseDate || new Date().toISOString().split('T')[0];

  // Parser le titre pour extraire l'artiste et le titre proprement
  const { artist, title } = parseSoundCloudTitle(trackData.title, profileName);
  const type = detectTrackType(trackData.title);

  return {
    id: trackId,
    title,
    artist,
    url: trackData.url,
    embedId,
    releaseDate,
    imageUrl: trackData.imageUrl,
    type,
  };
}
