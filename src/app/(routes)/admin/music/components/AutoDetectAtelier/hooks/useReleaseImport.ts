import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { logger } from '@/lib/logger';
import type { DetectedRelease, PlatformSearchResult } from '@/lib/services/types';
import { emptyTrackForm } from '@/lib/utils/music-helpers';
import { Track } from '@/lib/utils/types';

import { usePlatformEnrichment } from './usePlatformEnrichment';
import {
  createBaseFormData,
  updatePlatformsFromSearch,
  convertPlatformsToApiFormat,
  prepareImageIdForApi,
} from '../utils/releaseHelpers';

interface UseReleaseImportParams {
  releases: DetectedRelease[];
  selectedReleases: string[];
  setReleases: React.Dispatch<React.SetStateAction<DetectedRelease[]>>;
  setSelectedReleases: React.Dispatch<React.SetStateAction<string[]>>;
  fetchTracks?: () => Promise<void>;
  activeTab: 'spotify' | 'soundcloud' | 'youtube';
  invalidateCache: () => Promise<void>;
}

export function useReleaseImport({
  releases,
  selectedReleases,
  setReleases,
  setSelectedReleases,
  fetchTracks,
  activeTab,
  invalidateCache,
}: UseReleaseImportParams) {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [currentReleaseForImport, setCurrentReleaseForImport] = useState<DetectedRelease | null>(
    null
  );
  const [verifyFormData, setVerifyFormData] = useState<Omit<Track, 'id'> & { id?: string }>(
    emptyTrackForm
  );
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platformSearchResults, setPlatformSearchResults] = useState<PlatformSearchResult>({});
  const [musicalKey, setMusicalKey] = useState<string | undefined>(undefined);
  const [spotifyOriginalData, setSpotifyOriginalData] = useState<{
    bpm?: number;
    key?: string;
    genres: string[];
  }>({ genres: [] });

  const { enrichReleaseData, searchOtherPlatforms } = usePlatformEnrichment();

  const startVerificationProcess = () => {
    setVerifyIndex(0);
    setShowVerifyModal(true);
  };

  useEffect(() => {
    if (showVerifyModal && verifyIndex < selectedReleases.length) {
      const id = selectedReleases[verifyIndex];
      const release = releases.find((r) => r.id === id);
      if (!release) {
        setVerifyIndex((i) => i + 1);
        return;
      }

      // Préremplir avec les données de base
      const baseFormData = createBaseFormData(release);

      setCurrentReleaseForImport(release);
      setVerifyFormData(baseFormData);
      setPlatformSearchResults({});
      setMusicalKey(undefined);
      setSpotifyOriginalData({ genres: [] });

      // Enrichir les métadonnées et rechercher les autres plateformes en parallèle
      Promise.all([
        enrichReleaseData(release),
        searchOtherPlatforms(release.artist, release.title),
      ]).then(
        ([enriched, platforms]: [
          {
            genres?: string[];
            description?: string;
            releaseDate?: string;
            bpm?: number;
            key?: string;
          },
          PlatformSearchResult,
        ]) => {
          setPlatformSearchResults(platforms);
          // Stocker les données originales de Spotify pour comparaison
          const originalSpotifyData = {
            bpm: enriched.bpm,
            key: enriched.key,
            genres: enriched.genres || [],
          };
          setSpotifyOriginalData(originalSpotifyData);

          // Mettre à jour avec les données enrichies
          setVerifyFormData((prev) => ({
            ...prev,
            genre: enriched.genres || prev.genre || [],
            description: enriched.description || prev.description,
            releaseDate: enriched.releaseDate || prev.releaseDate,
            bpm: enriched.bpm || prev.bpm,
          }));

          // Stocker la clé musicale séparément
          if (enriched.key) {
            setMusicalKey(enriched.key);
          }

          // Ajouter les plateformes trouvées
          const updatedPlatforms = updatePlatformsFromSearch(baseFormData.platforms, platforms);

          setVerifyFormData((prev) => ({
            ...prev,
            platforms: updatedPlatforms,
          }));
        }
      );
    } else if (showVerifyModal && verifyIndex >= selectedReleases.length) {
      setShowVerifyModal(false);
      fetchTracks?.();
      setReleases((prev) =>
        prev.map((r) => (selectedReleases.includes(r.id) ? { ...r, exists: true } : r))
      );
      setSelectedReleases([]);
      toast.success('Importation terminée');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyIndex, showVerifyModal, selectedReleases, releases]);

  const confirmReleaseImport = async () => {
    if (!currentReleaseForImport) return;
    setIsSubmitting(true);
    try {
      // Convertir les plateformes en format API
      const platformsArray = convertPlatformsToApiFormat(verifyFormData.platforms);

      if (platformsArray.length === 0) {
        throw new Error('Au moins une plateforme est requise');
      }

      // Préparer l'imageId
      const { imageId: imageIdToSend, thumbnailUrl } = prepareImageIdForApi(
        verifyFormData.imageId ?? undefined,
        currentReleaseForImport.imageUrl
      );

      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verifyFormData,
          genreNames: verifyFormData.genre || [],
          platforms: platformsArray,
          imageId: imageIdToSend,
          thumbnailUrl: thumbnailUrl,
          musicalKey: musicalKey || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || res.statusText);
      }

      // Marquer la release comme importée dans la liste immédiatement
      if (currentReleaseForImport) {
        logger.debug('[AUTO-DETECT] Mise à jour - avant update, release:', {
          id: currentReleaseForImport.id,
          title: currentReleaseForImport.title,
          exists: currentReleaseForImport.exists,
        });

        // Invalider le cache de l'API
        await invalidateCache();

        setReleases((prev) => {
          const updated = prev.map((r) =>
            r.id === currentReleaseForImport.id ? { ...r, exists: true } : r
          );
          logger.debug(
            '[AUTO-DETECT] Mise à jour - après update, release modifiée:',
            updated.find((r) => r.id === currentReleaseForImport.id)
          );
          return updated;
        });
      }

      setIsSubmitting(false);
      setVerifyIndex((i) => i + 1);
      toast.success('Track importée avec succès');
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout de la track");
      setIsSubmitting(false);
    }
  };

  const skipCurrentRelease = () => {
    setVerifyIndex((i) => i + 1);
  };

  return {
    showVerifyModal,
    setShowVerifyModal,
    currentReleaseForImport,
    verifyFormData,
    setVerifyFormData,
    verifyIndex,
    isSubmitting,
    platformSearchResults,
    musicalKey,
    setMusicalKey,
    spotifyOriginalData,
    startVerificationProcess,
    confirmReleaseImport,
    skipCurrentRelease,
  };
}
