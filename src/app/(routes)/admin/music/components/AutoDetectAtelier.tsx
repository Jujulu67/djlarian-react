'use client';
import {
  X,
  ExternalLink,
  RefreshCw,
  Save,
  Search,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { DateTimeField } from '@/components/ui/DateTimeField';
import Modal from '@/components/ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';
import type { DetectedRelease, PlatformSearchResult } from '@/lib/services/types';
import { emptyTrackForm, MUSIC_TYPES } from '@/lib/utils/music-helpers';
import { extractPlatformId } from '@/lib/utils/music-service';
import { Track, MusicType, MusicPlatform } from '@/lib/utils/types';

/* -------------------------------------------------------------------------- */
/*  Types locaux                                                              */
/* -------------------------------------------------------------------------- */
interface AutoDetectAtelierProps {
  fetchTracks?: () => Promise<void>;
}

type MusicTypeOption = { label: string; value: MusicType };

/* -------------------------------------------------------------------------- */

const AutoDetectAtelier: React.FC<AutoDetectAtelierProps> = ({ fetchTracks }) => {
  /* ------------------------------ STATES --------------------------------- */
  const [artistId, setArtistId] = useState('6BzYsuiPSFBMJ7YnxLeKbz');
  const [artistName, setArtistName] = useState('');
  const [releases, setReleases] = useState<DetectedRelease[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);
  const [hideImported, setHideImported] = useState(false);
  const [showScheduledOnly, setShowScheduledOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReleases, setFilteredReleases] = useState<DetectedRelease[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [currentReleaseForImport, setCurrentReleaseForImport] = useState<DetectedRelease | null>(
    null
  );
  const [verifyFormData, setVerifyFormData] = useState<Omit<Track, 'id'> & { id?: string }>(
    emptyTrackForm
  );
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSearchingPlatforms, setIsSearchingPlatforms] = useState(false);
  const [platformSearchResults, setPlatformSearchResults] = useState<PlatformSearchResult>({});
  const [musicalKey, setMusicalKey] = useState<string | undefined>(undefined);
  // Données originales de Spotify pour détecter si elles ont été modifiées manuellement
  const [spotifyOriginalData, setSpotifyOriginalData] = useState<{
    bpm?: number;
    key?: string;
    genres: string[];
  }>({ genres: [] });
  /* ----------------------------------------------------------------------- */

  /* ---------------------------- API SPOTIFY ------------------------------ */
  const fetchReleases = async (forceRefresh = false) => {
    if (!artistId.trim() && !artistName.trim()) {
      setError("Veuillez entrer un Spotify Artist ID ou un nom d'artiste");
      return;
    }
    setIsLoadingReleases(true);
    setError(null);
    setReleases([]);
    try {
      const params = new URLSearchParams();
      if (artistId.trim()) params.append('artistId', artistId.trim());
      if (artistName.trim()) params.append('artistName', artistName.trim());
      if (forceRefresh) params.append('refresh', 'true');
      const url = `/api/spotify/releases?${params.toString()}`;
      logger.debug('[AUTO-DETECT] Fetch - URL:', url, 'forceRefresh:', forceRefresh);
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        const releasesData = data.releases || [];
        logger.debug('[AUTO-DETECT] Fetch - releases reçues:', releasesData.length);
        logger.debug(
          '[AUTO-DETECT] Fetch - releases avec exists=true:',
          releasesData.filter((r: DetectedRelease) => r.exists).length
        );
        logger.debug(
          '[AUTO-DETECT] Fetch - releases scheduled:',
          releasesData.filter((r: DetectedRelease) => r.isScheduled).length
        );
        logger.debug(
          '[AUTO-DETECT] Fetch - détails scheduled:',
          releasesData
            .filter((r: DetectedRelease) => r.isScheduled)
            .map((r: DetectedRelease) => ({
              id: r.id,
              title: r.title,
              date: r.releaseDate,
              isScheduled: r.isScheduled,
            }))
        );
        logger.debug(
          '[AUTO-DETECT] Fetch - détails exists:',
          releasesData.map((r: DetectedRelease) => ({ id: r.id, title: r.title, exists: r.exists }))
        );
        setReleases(releasesData);
      } else {
        setError(`Erreur: ${data.error || 'Impossible de récupérer les releases'}`);
      }
    } catch (err) {
      logger.error('Erreur:', err instanceof Error ? err.message : String(err));
      setError("Une erreur s'est produite lors de la récupération des releases");
    } finally {
      setIsLoadingReleases(false);
    }
  };
  /* ----------------------------------------------------------------------- */

  /* ------------------------- FILTRAGE LOCAL ------------------------------ */
  useEffect(() => {
    logger.debug('[AUTO-DETECT] Filtrage - hideImported:', hideImported);
    logger.debug('[AUTO-DETECT] Filtrage - showScheduledOnly:', showScheduledOnly);
    logger.debug('[AUTO-DETECT] Filtrage - releases totales:', releases.length);
    logger.debug(
      '[AUTO-DETECT] Filtrage - releases avec exists=true:',
      releases.filter((r) => r.exists).length
    );
    logger.debug(
      '[AUTO-DETECT] Filtrage - releases scheduled:',
      releases.filter((r) => r.isScheduled).length
    );
    logger.debug('[AUTO-DETECT] Filtrage - searchTerm:', searchTerm);

    let filtered = [...releases];
    logger.debug('[AUTO-DETECT] Filtrage - après copie:', filtered.length);

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      logger.debug('[AUTO-DETECT] Filtrage - après searchTerm:', filtered.length);
    }
    if (showScheduledOnly) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter((r) => r.isScheduled === true);
      logger.debug('[AUTO-DETECT] Filtrage - avant showScheduledOnly:', beforeFilter);
      logger.debug('[AUTO-DETECT] Filtrage - après showScheduledOnly:', filtered.length);
    }
    if (hideImported) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter((r) => !r.exists);
      logger.debug('[AUTO-DETECT] Filtrage - avant hideImported:', beforeFilter);
      logger.debug('[AUTO-DETECT] Filtrage - après hideImported:', filtered.length);
      logger.debug(
        '[AUTO-DETECT] Filtrage - releases filtrées (exists=true):',
        releases
          .filter((r) => r.exists)
          .map((r) => ({ id: r.id, title: r.title, exists: r.exists }))
      );
    }
    logger.debug('[AUTO-DETECT] Filtrage - résultat final:', filtered.length);
    setFilteredReleases(filtered);
  }, [releases, searchTerm, hideImported, showScheduledOnly]);
  /* ----------------------------------------------------------------------- */

  /* ---------------------- ENRICHISSEMENT MÉTADONNÉES --------------------- */
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

  /* ---------------------- RECHERCHE PLATEFORMES -------------------------- */
  const searchOtherPlatforms = async (artist: string, title: string) => {
    setIsSearchingPlatforms(true);
    try {
      const res = await fetch('/api/platforms/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, title }),
      });
      if (res.ok) {
        const results = (await res.json()) as PlatformSearchResult;
        setPlatformSearchResults(results);
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

  /* ---------------------- WORKFLOW D'IMPORT ------------------------------ */
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
      const baseFormData: Omit<Track, 'id'> & { id?: string } = {
        ...emptyTrackForm,
        title: release.title,
        artist: release.artist,
        releaseDate: release.releaseDate,
        type: release.type,
        platforms: {
          spotify: {
            url: release.spotifyUrl,
            embedId: release.spotifyId,
          },
        },
        // Ne pas mettre imageUrl dans imageId car c'est une URL, pas un imageId valide
        imageId: undefined,
      };

      setCurrentReleaseForImport(release);
      setVerifyFormData(baseFormData);
      setPlatformSearchResults({});
      setMusicalKey(undefined);
      setSpotifyOriginalData({ genres: [] }); // Réinitialiser

      // Enrichir les métadonnées et rechercher les autres plateformes en parallèle
      Promise.all([
        enrichReleaseData(release),
        searchOtherPlatforms(release.artist, release.title),
      ]).then(([enriched, platforms]) => {
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

        // Stocker la clé musicale séparément (pas encore dans le schéma)
        if (enriched.key) {
          setMusicalKey(enriched.key);
        }

        // Ajouter les plateformes trouvées
        const updatedPlatforms: Track['platforms'] = { ...baseFormData.platforms };
        if (platforms.youtube) {
          updatedPlatforms.youtube = {
            url: platforms.youtube.url,
            embedId: platforms.youtube.embedId,
          };
        }
        if (platforms.soundcloud) {
          updatedPlatforms.soundcloud = {
            url: platforms.soundcloud.url,
            embedId: platforms.soundcloud.embedId,
          };
        }
        if (platforms.apple) {
          updatedPlatforms.apple = {
            url: platforms.apple.url,
          };
        }
        if (platforms.deezer) {
          updatedPlatforms.deezer = {
            url: platforms.deezer.url,
            embedId: platforms.deezer.embedId,
          };
        }

        setVerifyFormData((prev) => ({
          ...prev,
          platforms: updatedPlatforms,
        }));
        setPlatformSearchResults(platforms);
      });
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
  }, [verifyIndex, showVerifyModal]);

  const confirmReleaseImport = async () => {
    if (!currentReleaseForImport) return;
    setIsSubmitting(true);
    try {
      // Convertir les plateformes en format API
      const platformsArray = Object.entries(verifyFormData.platforms || {})
        .filter(([, v]) => v?.url)
        .map(([p, v]) => ({
          platform: p as MusicPlatform,
          url: v!.url,
          embedId: extractPlatformId(v!.url, p as MusicPlatform) || v!.embedId,
        }));

      if (platformsArray.length === 0) {
        throw new Error('Au moins une plateforme est requise');
      }

      // Ne pas envoyer imageId si c'est une URL (release.imageUrl est une URL, pas un imageId)
      // imageId doit être un UUID ou un format timestamp-random, pas une URL
      const imageIdToSend =
        verifyFormData.imageId &&
        /^[a-z0-9]+-[a-z0-9]+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          verifyFormData.imageId
        )
          ? verifyFormData.imageId
          : undefined;

      // Si on a une imageUrl de Spotify mais pas d'imageId valide, envoyer thumbnailUrl pour que l'API la télécharge
      const thumbnailUrl =
        !imageIdToSend && currentReleaseForImport.imageUrl
          ? currentReleaseForImport.imageUrl
          : undefined;

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

        // Invalider le cache de l'API pour que le prochain fetch soit à jour
        try {
          await fetch('/api/spotify/releases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: artistId || undefined,
              artistName: artistName || undefined,
            }),
          });
          logger.debug('[AUTO-DETECT] Cache invalidé avec succès');
        } catch (err) {
          logger.warn("[AUTO-DETECT] Erreur lors de l'invalidation du cache:", err);
        }

        setReleases((prev) => {
          const updated = prev.map((r) =>
            r.id === currentReleaseForImport.id ? { ...r, exists: true } : r
          );
          logger.debug(
            '[AUTO-DETECT] Mise à jour - après update, release modifiée:',
            updated.find((r) => r.id === currentReleaseForImport.id)
          );
          logger.debug(
            '[AUTO-DETECT] Mise à jour - total releases avec exists=true:',
            updated.filter((r) => r.exists).length
          );
          logger.debug(
            '[AUTO-DETECT] Mise à jour - toutes les releases:',
            updated.map((r) => ({ id: r.id, title: r.title, exists: r.exists }))
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

  const toggleReleaseSelection = (id: string) =>
    setSelectedReleases((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  /* ----------------------------------------------------------------------- */

  /* ------------------------------ RENDER --------------------------------- */
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Auto-détection des releases Spotify
        </h2>
        <p className="text-gray-300 mb-6">
          Détectez automatiquement vos releases sur Spotify et importez-les avec enrichissement
          automatique des métadonnées (MusicBrainz, Last.fm) et recherche des liens sur les autres
          plateformes.
        </p>
        {/* Zone de configuration */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReleases();
          }}
          className="flex flex-col gap-4 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="artistId" className="block text-gray-300 font-medium mb-2">
                Spotify Artist ID
              </label>
              <input
                id="artistId"
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: 4Z8W4fKeB5YxbusRsdQVPb"
              />
              <p className="text-xs text-gray-400 mt-1">
                Trouvez votre Artist ID sur votre profil Spotify
              </p>
            </div>
            <div>
              <label htmlFor="artistName" className="block text-gray-300 font-medium mb-2">
                Ou nom d&apos;artiste
              </label>
              <input
                id="artistName"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: Larian"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoadingReleases || (!artistId.trim() && !artistName.trim())}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 self-start"
            >
              {isLoadingReleases ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rechercher les releases
                </>
              )}
            </button>
            {releases.length > 0 && (
              <button
                type="button"
                onClick={() => fetchReleases(true)}
                disabled={isLoadingReleases}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 self-start"
                title="Forcer le refresh (ignorer le cache)"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            )}
          </div>
        </form>
        {/* Erreur éventuelle */}
        {error && (
          <div className="p-4 mb-6 bg-red-900/30 border border-red-700/50 rounded-lg text-red-200 flex gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
        {/* Options de filtrage */}
        {!!releases.length && (
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                placeholder="Filtrer…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showScheduledOnly}
                    onChange={() => {
                      const newValue = !showScheduledOnly;
                      logger.debug('[AUTO-DETECT] Switch - changement showScheduledOnly:', {
                        from: showScheduledOnly,
                        to: newValue,
                      });
                      logger.debug(
                        '[AUTO-DETECT] Switch - releases scheduled:',
                        releases.filter((r) => r.isScheduled).length
                      );
                      setShowScheduledOnly(newValue);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-5 rounded-full ${showScheduledOnly ? 'bg-purple-600' : 'bg-gray-700'} relative`}
                  >
                    <div
                      className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showScheduledOnly ? 'translate-x-5' : ''}`}
                    />
                  </div>
                  <span className="ml-2 text-sm text-gray-300">
                    Afficher uniquement les pré-releases
                  </span>
                </label>
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideImported}
                    onChange={() => {
                      const newValue = !hideImported;
                      logger.debug('[AUTO-DETECT] Switch - changement hideImported:', {
                        from: hideImported,
                        to: newValue,
                      });
                      logger.debug('[AUTO-DETECT] Switch - releases totales:', releases.length);
                      logger.debug(
                        '[AUTO-DETECT] Switch - releases avec exists=true:',
                        releases.filter((r) => r.exists).length
                      );
                      setHideImported(newValue);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-5 rounded-full ${hideImported ? 'bg-purple-600' : 'bg-gray-700'} relative`}
                  >
                    <div
                      className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${hideImported ? 'translate-x-5' : ''}`}
                    />
                  </div>
                  <span className="ml-2 text-sm text-gray-300">Masquer les déjà importées</span>
                </label>
              </div>
            </div>
          </div>
        )}
        {/* Liste releases */}
        {!!releases.length && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">
                {filteredReleases.length} releases trouvées
              </h3>
              <button
                onClick={startVerificationProcess}
                disabled={isSubmitting || !selectedReleases.length}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Import…
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Importer la sélection ({selectedReleases.length})
                  </>
                )}
              </button>
            </div>
            <div className="space-y-4">
              {filteredReleases.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    if (!r.exists) toggleReleaseSelection(r.id);
                  }}
                  onKeyDown={(e) => {
                    if (!r.exists && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      toggleReleaseSelection(r.id);
                    }
                  }}
                  tabIndex={0}
                  aria-label={
                    r.exists
                      ? `Release déjà importée : ${r.title}`
                      : selectedReleases.includes(r.id)
                        ? `Désélectionner : ${r.title}`
                        : `Sélectionner : ${r.title}`
                  }
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    r.exists
                      ? 'bg-green-900/20 border-green-700/50 text-green-200'
                      : selectedReleases.includes(r.id)
                        ? 'bg-purple-900/30 border-purple-700/50'
                        : 'bg-gray-800/40 border-gray-700/30'
                  }
                    cursor-pointer
                    hover:ring-2 hover:ring-purple-500`}
                >
                  {!r.exists && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReleaseSelection(r.id);
                      }}
                      className={`p-2 rounded-md ${selectedReleases.includes(r.id) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      aria-label={
                        selectedReleases.includes(r.id) ? 'Désélectionner' : 'Sélectionner'
                      }
                      tabIndex={0}
                    >
                      {selectedReleases.includes(r.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {r.imageUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                      <Image
                        src={r.imageUrl}
                        alt={r.title}
                        fill
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-white">{r.title}</h4>
                    <p className="text-sm text-gray-400 truncate">{r.artist}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-200 whitespace-nowrap">
                        {MUSIC_TYPES.find((t) => t.value === r.type)?.label || r.type}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(r.releaseDate).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                      {r.isScheduled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-700/50 text-blue-200 whitespace-nowrap">
                          Pré-release
                        </span>
                      )}
                      {r.exists && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-700/50 text-green-200 whitespace-nowrap">
                          Déjà importé
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={r.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg flex-shrink-0"
                    title="Voir sur Spotify"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Modale de vérification */}
        {showVerifyModal && currentReleaseForImport && (
          <Modal
            maxWidth="max-w-4xl"
            showLoader={false}
            bgClass="bg-gray-800"
            borderClass="border-gray-700"
            onClose={() => setShowVerifyModal(false)}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  Vérifier ({verifyIndex + 1}/{selectedReleases.length})
                </h2>
                {(isEnriching || isSearchingPlatforms) && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {isEnriching && 'Enrichissement des métadonnées...'}
                    {isSearchingPlatforms && 'Recherche des plateformes...'}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Aperçu release - Colonne gauche */}
                <div className="space-y-4">
                  {currentReleaseForImport.imageUrl && (
                    <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                      <Image
                        src={currentReleaseForImport.imageUrl}
                        alt={currentReleaseForImport.title}
                        fill
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Informations Spotify enrichies - Afficher seulement si les données correspondent aux données originales de Spotify */}
                  {(() => {
                    // Vérifier si les données actuelles correspondent aux données originales de Spotify
                    const bpmMatches =
                      verifyFormData.bpm === spotifyOriginalData.bpm ||
                      (!verifyFormData.bpm && !spotifyOriginalData.bpm);
                    const keyMatches =
                      musicalKey === spotifyOriginalData.key ||
                      (!musicalKey && !spotifyOriginalData.key);
                    const genresMatch =
                      verifyFormData.genre.length === spotifyOriginalData.genres.length &&
                      verifyFormData.genre.every((g) => spotifyOriginalData.genres.includes(g)) &&
                      spotifyOriginalData.genres.every((g) => verifyFormData.genre.includes(g));

                    const hasSpotifyData =
                      spotifyOriginalData.bpm ||
                      spotifyOriginalData.key ||
                      spotifyOriginalData.genres.length > 0;
                    const shouldShow = hasSpotifyData && bpmMatches && keyMatches && genresMatch;

                    return shouldShow ? (
                      <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                        <h3 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Données Spotify
                        </h3>
                        <div className="space-y-2 text-sm">
                          {spotifyOriginalData.bpm ? (
                            <div className="flex justify-between">
                              <span className="text-gray-400">BPM:</span>
                              <span className="text-white font-medium">
                                {spotifyOriginalData.bpm}
                              </span>
                            </div>
                          ) : null}
                          {spotifyOriginalData.key ? (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Clé:</span>
                              <span className="text-white font-medium">
                                {spotifyOriginalData.key}
                              </span>
                            </div>
                          ) : null}
                          {spotifyOriginalData.genres.length > 0 ? (
                            <div>
                              <span className="text-gray-400 block mb-1">Genres:</span>
                              <div className="flex flex-wrap gap-1">
                                {spotifyOriginalData.genres.slice(0, 3).map((g) => (
                                  <span
                                    key={g}
                                    className="text-xs px-2 py-0.5 rounded bg-purple-600/30 text-purple-200"
                                  >
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <a
                    href={currentReleaseForImport.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir sur Spotify
                  </a>

                  {/* Afficher les plateformes trouvées */}
                  {Object.keys(platformSearchResults).length > 0 && (
                    <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <p className="text-xs text-green-200 mb-2 font-medium">
                        Plateformes trouvées :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {platformSearchResults.youtube && (
                          <a
                            href={platformSearchResults.youtube.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-red-600/30 text-red-200 hover:bg-red-600/50 transition-colors cursor-pointer"
                          >
                            YouTube
                          </a>
                        )}
                        {platformSearchResults.soundcloud && (
                          <a
                            href={platformSearchResults.soundcloud.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-orange-600/30 text-orange-200 hover:bg-orange-600/50 transition-colors cursor-pointer"
                          >
                            SoundCloud
                          </a>
                        )}
                        {platformSearchResults.apple && (
                          <a
                            href={platformSearchResults.apple.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-pink-600/30 text-pink-200 hover:bg-pink-600/50 transition-colors cursor-pointer"
                          >
                            Apple Music
                          </a>
                        )}
                        {platformSearchResults.deezer && (
                          <a
                            href={platformSearchResults.deezer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 transition-colors cursor-pointer"
                          >
                            Deezer
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Formulaire vérif avec tabs */}
                <div className="lg:col-span-2">
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-700/50 mb-4">
                      <TabsTrigger value="info" className="data-[state=active]:bg-purple-600">
                        Informations
                      </TabsTrigger>
                      <TabsTrigger value="platforms" className="data-[state=active]:bg-purple-600">
                        Plateformes
                      </TabsTrigger>
                      <TabsTrigger value="metadata" className="data-[state=active]:bg-purple-600">
                        Métadonnées
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                      {/* Titre */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-1">
                          Titre <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={verifyFormData.title}
                          onChange={(e) =>
                            setVerifyFormData({ ...verifyFormData, title: e.target.value })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                        />
                      </div>
                      {/* Artiste */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-1">
                          Artiste(s) <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={verifyFormData.artist}
                          onChange={(e) =>
                            setVerifyFormData({ ...verifyFormData, artist: e.target.value })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                        />
                      </div>
                      {/* Type + Date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 font-medium mb-1">
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={verifyFormData.type}
                            onChange={(e) =>
                              setVerifyFormData({
                                ...verifyFormData,
                                type: e.target.value as MusicType,
                              })
                            }
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                          >
                            {MUSIC_TYPES.map((t: MusicTypeOption) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 font-medium mb-1">
                            Date <span className="text-red-500">*</span>
                          </label>
                          <DateTimeField
                            type="date"
                            value={verifyFormData.releaseDate}
                            onChange={(e) =>
                              setVerifyFormData({ ...verifyFormData, releaseDate: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>
                      {/* Genres */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-1">Genres</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            value={genreInput}
                            onChange={(e) => setGenreInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (
                                  genreInput.trim() &&
                                  !verifyFormData.genre.includes(genreInput.trim())
                                ) {
                                  setVerifyFormData({
                                    ...verifyFormData,
                                    genre: [...verifyFormData.genre, genreInput.trim()],
                                  });
                                  setGenreInput('');
                                }
                              }
                            }}
                            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                            placeholder="Ajouter un genre"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                genreInput.trim() &&
                                !verifyFormData.genre.includes(genreInput.trim())
                              ) {
                                setVerifyFormData({
                                  ...verifyFormData,
                                  genre: [...verifyFormData.genre, genreInput.trim()],
                                });
                                setGenreInput('');
                              }
                            }}
                            className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {verifyFormData.genre.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-600/30 text-purple-200"
                            >
                              {g}
                              <button
                                onClick={() =>
                                  setVerifyFormData({
                                    ...verifyFormData,
                                    genre: verifyFormData.genre.filter((x) => x !== g),
                                  })
                                }
                              >
                                <X className="w-3 h-3 ml-1" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="platforms" className="space-y-2">
                      {/* Spotify - toujours affiché */}
                      <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                        <span className="text-sm text-gray-300 w-20">Spotify:</span>
                        <input
                          value={
                            verifyFormData.platforms?.spotify?.url ||
                            currentReleaseForImport.spotifyUrl ||
                            ''
                          }
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              platforms: {
                                ...verifyFormData.platforms,
                                spotify: {
                                  url: e.target.value,
                                  embedId:
                                    extractPlatformId(e.target.value, 'spotify') || undefined,
                                },
                              },
                            })
                          }
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="https://open.spotify.com/..."
                        />
                        {verifyFormData.platforms?.spotify?.url && (
                          <a
                            href={verifyFormData.platforms.spotify.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {/* YouTube - toujours affiché */}
                      <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                        <span className="text-sm text-gray-300 w-20">YouTube:</span>
                        <input
                          value={verifyFormData.platforms?.youtube?.url || ''}
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              platforms: {
                                ...verifyFormData.platforms,
                                youtube: {
                                  url: e.target.value,
                                  embedId:
                                    extractPlatformId(e.target.value, 'youtube') || undefined,
                                },
                              },
                            })
                          }
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        {verifyFormData.platforms?.youtube?.url && (
                          <a
                            href={verifyFormData.platforms.youtube.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {/* SoundCloud - toujours affiché */}
                      <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                        <span className="text-sm text-gray-300 w-20">SoundCloud:</span>
                        <input
                          value={verifyFormData.platforms?.soundcloud?.url || ''}
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              platforms: {
                                ...verifyFormData.platforms,
                                soundcloud: {
                                  url: e.target.value,
                                  embedId:
                                    extractPlatformId(e.target.value, 'soundcloud') || undefined,
                                },
                              },
                            })
                          }
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="https://soundcloud.com/..."
                        />
                        {verifyFormData.platforms?.soundcloud?.url && (
                          <a
                            href={verifyFormData.platforms.soundcloud.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-600 rounded transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {/* Apple Music - toujours affiché */}
                      <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                        <span className="text-sm text-gray-300 w-20">Apple Music:</span>
                        <input
                          value={verifyFormData.platforms?.apple?.url || ''}
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              platforms: {
                                ...verifyFormData.platforms,
                                apple: { url: e.target.value },
                              },
                            })
                          }
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="https://music.apple.com/..."
                        />
                        {verifyFormData.platforms?.apple?.url && (
                          <a
                            href={verifyFormData.platforms.apple.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-pink-400 hover:bg-gray-600 rounded transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {/* Deezer - toujours affiché */}
                      <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                        <span className="text-sm text-gray-300 w-20">Deezer:</span>
                        <input
                          value={verifyFormData.platforms?.deezer?.url || ''}
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              platforms: {
                                ...verifyFormData.platforms,
                                deezer: {
                                  url: e.target.value,
                                  embedId: extractPlatformId(e.target.value, 'deezer') || undefined,
                                },
                              },
                            })
                          }
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          placeholder="https://www.deezer.com/..."
                        />
                        {verifyFormData.platforms?.deezer?.url && (
                          <a
                            href={verifyFormData.platforms.deezer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="metadata" className="space-y-4">
                      {/* BPM et Clé musicale */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 font-medium mb-1">
                            BPM
                            {verifyFormData.bpm &&
                              verifyFormData.bpm === spotifyOriginalData.bpm && (
                                <span className="ml-2 text-xs text-green-400">✓ Spotify</span>
                              )}
                          </label>
                          <input
                            type="number"
                            value={verifyFormData.bpm || ''}
                            onChange={(e) =>
                              setVerifyFormData({
                                ...verifyFormData,
                                bpm: parseInt(e.target.value) || undefined,
                              })
                            }
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                            placeholder="Ex : 128"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 font-medium mb-1">
                            Clé musicale
                            {musicalKey && musicalKey === spotifyOriginalData.key && (
                              <span className="ml-2 text-xs text-green-400">✓ Spotify</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={musicalKey || ''}
                            onChange={(e) => setMusicalKey(e.target.value || undefined)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                            placeholder="Ex : C# min"
                          />
                        </div>
                      </div>
                      {/* Description */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-1">
                          Description
                          {verifyFormData.description && (
                            <span className="ml-2 text-xs text-green-400">✓ Enrichie</span>
                          )}
                        </label>
                        <textarea
                          value={verifyFormData.description || ''}
                          onChange={(e) =>
                            setVerifyFormData({ ...verifyFormData, description: e.target.value })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500 resize-none h-32"
                          placeholder="Description du morceau (pitch, contexte, etc.)"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Pitch, contexte de création, ou informations complémentaires
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between pt-4 mt-4 border-t border-gray-700">
                    <button
                      onClick={skipCurrentRelease}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                      disabled={isSubmitting}
                    >
                      Ignorer
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowVerifyModal(false)}
                        className="px-4 py-2 bg-red-800/60 hover:bg-red-700/60 text-white rounded-lg"
                        disabled={isSubmitting}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={confirmReleaseImport}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Import…
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Confirmer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AutoDetectAtelier;
