'use client';
import { AlertCircle, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { logger } from '@/lib/logger';
import type { DetectedRelease } from '@/lib/services/types';

import { PlatformTabs } from './AutoDetectAtelier/components/PlatformTabs';
import { ReleaseFilters } from './AutoDetectAtelier/components/ReleaseFilters';
import { ReleaseList } from './AutoDetectAtelier/components/ReleaseList';
import { VerifyModal } from './AutoDetectAtelier/components/VerifyModal';
import { usePlatformEnrichment } from './AutoDetectAtelier/hooks/usePlatformEnrichment';
import { useReleaseImport } from './AutoDetectAtelier/hooks/useReleaseImport';
import { useReleases } from './AutoDetectAtelier/hooks/useReleases';

/* -------------------------------------------------------------------------- */
/*  Types locaux                                                              */
/* -------------------------------------------------------------------------- */
interface AutoDetectAtelierProps {
  fetchTracks?: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */

const AutoDetectAtelier: React.FC<AutoDetectAtelierProps> = ({ fetchTracks }) => {
  /* ------------------------------ STATES --------------------------------- */
  const [activeTab, setActiveTab] = useState<'spotify' | 'soundcloud' | 'youtube'>('spotify');

  // Spotify states
  const [artistId, setArtistId] = useState('6BzYsuiPSFBMJ7YnxLeKbz');
  const [artistName, setArtistName] = useState('');

  // SoundCloud states
  const [soundcloudArtistName, setSoundcloudArtistName] = useState('');
  const [soundcloudProfileUrl, setSoundcloudProfileUrl] = useState(
    'https://soundcloud.com/larian67'
  );

  // YouTube states
  const [youtubeUsername, setYoutubeUsername] = useState('https://www.youtube.com/@DJLarian');
  const [maxResults, setMaxResults] = useState(25);

  // Shared states
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);
  const [hideImported, setHideImported] = useState(false);
  const [showScheduledOnly, setShowScheduledOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cache des releases par onglet
  const [releasesCache, setReleasesCache] = useState<{
    spotify: DetectedRelease[];
    soundcloud: DetectedRelease[];
    youtube: DetectedRelease[];
  }>({
    spotify: [],
    soundcloud: [],
    youtube: [],
  });

  // Hooks refactorisés
  const {
    releases,
    setReleases,
    isLoadingReleases,
    setIsLoadingReleases,
    error,
    setError,
    filteredReleases,
  } = useReleases({ searchTerm, hideImported, showScheduledOnly });

  // Sauvegarder les releases dans le cache quand elles changent (sauf lors d'un changement d'onglet)
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    // Ne sauvegarder que si l'onglet n'a pas changé (pour éviter de sauvegarder lors du changement d'onglet)
    if (prevActiveTabRef.current === activeTab && releases.length > 0) {
      setReleasesCache((prev) => ({
        ...prev,
        [activeTab]: releases,
      }));
    }
    prevActiveTabRef.current = activeTab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releases]);

  // Gérer le changement d'onglet avec cache
  const handleTabChange = (newTab: 'spotify' | 'soundcloud' | 'youtube') => {
    // Sauvegarder les releases actuelles dans le cache de l'onglet précédent
    // et restaurer les releases de l'onglet sélectionné en une seule opération
    setReleasesCache((prev) => {
      const updated = {
        ...prev,
        [activeTab]: releases,
      };
      // Restaurer les releases de l'onglet sélectionné depuis le cache mis à jour
      setReleases(updated[newTab]);
      return updated;
    });

    setActiveTab(newTab);
  };

  const { isEnriching, isSearchingPlatforms } = usePlatformEnrichment();

  // Fonction pour invalider le cache selon la plateforme active
  const invalidateCache = async () => {
    try {
      if (activeTab === 'spotify') {
        await fetch('/api/spotify/releases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artistId || undefined,
            artistName: artistName || undefined,
          }),
        });
      } else if (activeTab === 'soundcloud') {
        await fetch('/api/soundcloud/releases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: soundcloudArtistName || undefined,
            profileUrl: soundcloudProfileUrl || undefined,
          }),
        });
      } else if (activeTab === 'youtube') {
        // YouTube n'a pas de cache invalidation POST pour l'instant
        // Le cache est géré via query params
      }
      logger.debug('[AUTO-DETECT] Cache invalidé avec succès');
    } catch (err) {
      logger.warn("[AUTO-DETECT] Erreur lors de l'invalidation du cache:", err);
    }
  };

  // Hook pour gérer le workflow d'import
  const {
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
  } = useReleaseImport({
    releases,
    selectedReleases,
    setReleases,
    setSelectedReleases,
    fetchTracks,
    activeTab,
    invalidateCache,
  });
  /* ----------------------------------------------------------------------- */

  /* ---------------------------- API SPOTIFY ------------------------------ */
  const fetchReleases = async (forceRefresh = false) => {
    if (!artistId.trim() && !artistName.trim()) {
      setError("Veuillez entrer un Spotify Artist ID ou un nom d'artiste");
      return;
    }
    setIsLoadingReleases(true);
    setError(null);
    // Ne pas vider les releases si on a déjà des données en cache
    if (forceRefresh || releasesCache.spotify.length === 0) {
      setReleases([]);
    }
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
        // Mettre à jour le cache
        setReleasesCache((prev) => ({
          ...prev,
          spotify: releasesData,
        }));
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

  /* ---------------------------- API SOUNDCLOUD --------------------------- */
  const fetchSoundCloudReleases = async (forceRefresh = false) => {
    if (!soundcloudArtistName.trim() && !soundcloudProfileUrl.trim()) {
      setError("Veuillez entrer un nom d'artiste SoundCloud ou une URL de profil");
      return;
    }
    setIsLoadingReleases(true);
    setError(null);
    // Ne pas vider les releases si on a déjà des données en cache
    if (forceRefresh || releasesCache.soundcloud.length === 0) {
      setReleases([]);
    }

    // Créer un AbortController pour gérer le timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 120000); // 120 secondes (2 minutes) - plus long que le timeout serveur pour laisser le temps

    try {
      const params = new URLSearchParams();
      if (soundcloudArtistName.trim()) params.append('artistName', soundcloudArtistName.trim());
      if (soundcloudProfileUrl.trim()) params.append('profileUrl', soundcloudProfileUrl.trim());
      if (forceRefresh) params.append('refresh', 'true');
      const url = `/api/soundcloud/releases?${params.toString()}`;
      logger.debug('[AUTO-DETECT] Fetch SoundCloud - URL:', url, 'forceRefresh:', forceRefresh);

      const startTime = Date.now();
      const res = await fetch(url, {
        signal: abortController.signal,
      });
      const fetchDuration = Date.now() - startTime;
      logger.debug(`[AUTO-DETECT] Fetch SoundCloud - Durée: ${fetchDuration}ms`);

      const data = await res.json();

      if (res.ok) {
        const releasesData = data.releases || [];
        logger.debug('[AUTO-DETECT] Fetch SoundCloud - releases reçues:', releasesData.length);
        logger.debug(
          '[AUTO-DETECT] Fetch SoundCloud - releases avec exists=true:',
          releasesData.filter((r: DetectedRelease) => r.exists).length
        );
        logger.debug(
          '[AUTO-DETECT] Fetch SoundCloud - releases scheduled:',
          releasesData.filter((r: DetectedRelease) => r.isScheduled).length
        );
        setReleases(releasesData);
        // Mettre à jour le cache
        setReleasesCache((prev) => ({
          ...prev,
          soundcloud: releasesData,
        }));
      } else {
        // Gérer les erreurs spécifiques
        const errorMessage =
          data.message || data.error || 'Impossible de récupérer les tracks SoundCloud';
        let userMessage = errorMessage;

        // Messages d'erreur spécifiques pour Puppeteer
        if (
          res.status === 503 &&
          (data.error?.includes('Puppeteer') || data.error?.includes('Chromium'))
        ) {
          userMessage = `Puppeteer/Chromium non disponible: ${data.message || data.details || errorMessage}. Vérifiez la configuration sur Vercel (variable AWS_LAMBDA_JS_RUNTIME=nodejs22.x).`;
        } else if (res.status === 500) {
          userMessage = `Erreur serveur: ${errorMessage}. Vérifiez les logs pour plus de détails.`;
        }

        logger.error('[AUTO-DETECT] Erreur SoundCloud API:', {
          status: res.status,
          error: data.error,
          message: data.message,
          details: data.details,
        });
        setError(userMessage);
      }
    } catch (err) {
      // Gérer les erreurs de timeout et réseau
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          logger.error('[AUTO-DETECT] Timeout SoundCloud:', {
            error: err.message,
            duration: '120s',
          });
          setError(
            'La requête a pris trop de temps (timeout après 2 minutes). Le scraping SoundCloud peut être lent. Réessayez ou vérifiez la configuration Puppeteer.'
          );
        } else if (err.message.includes('fetch')) {
          logger.error('[AUTO-DETECT] Erreur réseau SoundCloud:', {
            error: err.message,
            stack: err.stack,
          });
          setError('Erreur réseau lors de la récupération des tracks. Vérifiez votre connexion.');
        } else {
          logger.error('[AUTO-DETECT] Erreur SoundCloud:', {
            error: err.message,
            stack: err.stack,
          });
          setError(`Erreur: ${err.message}`);
        }
      } else {
        logger.error('[AUTO-DETECT] Erreur SoundCloud inconnue:', err);
        setError("Une erreur s'est produite lors de la récupération des tracks SoundCloud");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingReleases(false);
    }
  };
  /* ----------------------------------------------------------------------- */

  /* ---------------------------- API YOUTUBE ------------------------------- */
  const fetchYouTubeReleases = async (forceRefresh = false) => {
    if (!youtubeUsername.trim()) {
      setError("Veuillez entrer un nom d'utilisateur ou une URL de chaîne YouTube");
      return;
    }
    setIsLoadingReleases(true);
    setError(null);
    // Ne pas vider les releases si on a déjà des données en cache
    if (forceRefresh || releasesCache.youtube.length === 0) {
      setReleases([]);
    }
    try {
      const params = new URLSearchParams();
      params.append('q', youtubeUsername.trim());
      params.append('maxResults', maxResults.toString());
      params.append('format', 'releases'); // Utiliser le nouveau format
      if (forceRefresh) params.append('refresh', 'true');
      const url = `/api/youtube?${params.toString()}`;
      logger.debug('[AUTO-DETECT] Fetch YouTube - URL:', url, 'forceRefresh:', forceRefresh);
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        const releasesData = data.releases || [];
        logger.debug('[AUTO-DETECT] Fetch YouTube - releases reçues:', releasesData.length);
        logger.debug(
          '[AUTO-DETECT] Fetch YouTube - releases avec exists=true:',
          releasesData.filter((r: DetectedRelease) => r.exists).length
        );
        logger.debug(
          '[AUTO-DETECT] Fetch YouTube - releases scheduled:',
          releasesData.filter((r: DetectedRelease) => r.isScheduled).length
        );
        setReleases(releasesData);
        // Mettre à jour le cache
        setReleasesCache((prev) => ({
          ...prev,
          youtube: releasesData,
        }));
      } else {
        setError(`Erreur: ${data.error || 'Impossible de récupérer les vidéos YouTube'}`);
      }
    } catch (err) {
      logger.error('Erreur YouTube:', err instanceof Error ? err.message : String(err));
      setError("Une erreur s'est produite lors de la récupération des vidéos YouTube");
    } finally {
      setIsLoadingReleases(false);
    }
  };
  /* ----------------------------------------------------------------------- */

  const toggleReleaseSelection = (id: string) =>
    setSelectedReleases((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  /* ----------------------------------------------------------------------- */

  /* ------------------------------ RENDER --------------------------------- */
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Auto-détection des releases
        </h2>
        <p className="text-gray-300 mb-6">
          Détectez automatiquement vos releases sur Spotify ou SoundCloud et importez-les avec
          enrichissement automatique des métadonnées (MusicBrainz, Last.fm) et recherche des liens
          sur les autres plateformes.
        </p>

        {/* Onglets */}
        <PlatformTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoadingReleases}
          hasReleases={releases.length > 0}
          spotifyArtistId={artistId}
          onSpotifyArtistIdChange={setArtistId}
          spotifyArtistName={artistName}
          onSpotifyArtistNameChange={setArtistName}
          onSpotifyFetch={fetchReleases}
          soundcloudArtistName={soundcloudArtistName}
          onSoundcloudArtistNameChange={setSoundcloudArtistName}
          soundcloudProfileUrl={soundcloudProfileUrl}
          onSoundcloudProfileUrlChange={setSoundcloudProfileUrl}
          onSoundcloudFetch={fetchSoundCloudReleases}
          youtubeUsername={youtubeUsername}
          onYoutubeUsernameChange={setYoutubeUsername}
          maxResults={maxResults}
          onMaxResultsChange={setMaxResults}
          onYoutubeFetch={fetchYouTubeReleases}
        />
        {/* Erreur éventuelle */}
        {error && (
          <div className="p-4 mb-6 bg-red-900/30 border border-red-700/50 rounded-lg text-red-200 flex gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
        {/* Options de filtrage */}
        <ReleaseFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          hideImported={hideImported}
          onHideImportedChange={setHideImported}
          showScheduledOnly={showScheduledOnly}
          onShowScheduledOnlyChange={setShowScheduledOnly}
          releases={releases}
        />
        {/* Liste releases */}
        <ReleaseList
          releases={releases}
          filteredReleases={filteredReleases}
          selectedReleases={selectedReleases}
          onToggleSelection={toggleReleaseSelection}
          onStartImport={startVerificationProcess}
          isSubmitting={isSubmitting}
        />
        {/* Modale de vérification */}
        <VerifyModal
          show={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          currentRelease={currentReleaseForImport}
          verifyFormData={verifyFormData}
          onFormDataChange={setVerifyFormData}
          verifyIndex={verifyIndex}
          totalReleases={selectedReleases.length}
          isSubmitting={isSubmitting}
          isEnriching={isEnriching}
          isSearchingPlatforms={isSearchingPlatforms}
          platformSearchResults={platformSearchResults}
          musicalKey={musicalKey}
          onMusicalKeyChange={setMusicalKey}
          spotifyOriginalData={spotifyOriginalData}
          onConfirm={confirmReleaseImport}
          onSkip={skipCurrentRelease}
        />
      </div>
    </div>
  );
};

export default AutoDetectAtelier;
