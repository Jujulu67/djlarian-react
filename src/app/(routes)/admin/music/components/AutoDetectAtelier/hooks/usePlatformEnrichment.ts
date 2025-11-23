import { useState } from 'react';

import { logger } from '@/lib/logger';
import type { DetectedRelease } from '@/lib/services/types';

export function usePlatformEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSearchingPlatforms, setIsSearchingPlatforms] = useState(false);

  const enrichReleaseData = async (release: DetectedRelease) => {
    setIsEnriching(true);
    try {
      // Enrichir via Spotify (BPM, key, genres de l'album)
      const spotifyRes = release.spotifyId
        ? await fetch('/api/spotify/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId: release.spotifyId }),
          })
        : null;
      const spotifyData = spotifyRes?.ok ? await spotifyRes.json() : {};

      // Enrichir via MusicBrainz
      const mbRes = await fetch('/api/musicbrainz/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: release.artist, title: release.title }),
      });
      const mbData = mbRes.ok ? await mbRes.json() : {};

      // Enrichir via Last.fm
      const lfRes = await fetch('/api/lastfm/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: release.artist, title: release.title }),
      });
      const lfData = lfRes.ok ? await lfRes.json() : {};

      // Combiner les genres (Spotify + MusicBrainz + Last.fm)
      const allGenres = [
        ...(spotifyData.genres || []),
        ...(mbData.genres || []),
        ...(mbData.tags || []),
        ...(lfData.tags || []),
      ].filter((g, i, arr) => arr.indexOf(g) === i); // Dédupliquer

      return {
        genres: allGenres.slice(0, 10),
        description: lfData.description || mbData.description,
        releaseDate: mbData.releaseDate || release.releaseDate,
        bpm: spotifyData.bpm,
        key: spotifyData.key,
      };
    } catch (err) {
      logger.error("Erreur lors de l'enrichissement:", err);
      return {};
    } finally {
      setIsEnriching(false);
    }
  };

  const searchOtherPlatforms = async (artist: string, title: string) => {
    setIsSearchingPlatforms(true);
    try {
      const res = await fetch('/api/platforms/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, title }),
      });
      if (res.ok) {
        const results = await res.json();
        return results;
      }
      return {};
    } catch (err) {
      logger.error('Erreur lors de la recherche de plateformes:', err);
      return {};
    } finally {
      setIsSearchingPlatforms(false);
    }
  };

  return {
    isEnriching,
    isSearchingPlatforms,
    enrichReleaseData,
    searchOtherPlatforms,
  };
}
