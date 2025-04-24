'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Track, MusicType } from '@/lib/utils/types';
import { X, ExternalLink, RefreshCw, Save, Search, Plus, Check, AlertCircle } from 'lucide-react';
import { extractInfoFromTitle, emptyTrackForm, MUSIC_TYPES } from '@/lib/utils/music-helpers';
import Modal from '@/components/ui/Modal';

/* -------------------------------------------------------------------------- */
/*  Types locaux                                                              */
/* -------------------------------------------------------------------------- */
interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  exists: boolean;
}
interface YoutubeAtelierProps {
  fetchTracks?: () => Promise<void>;
}

// Typage explicite pour les options de MUSIC_TYPES
// Si tu veux, exporte ce type depuis music-helpers.ts
// Sinon, on le définit ici pour le map
type MusicTypeOption = { label: string; value: MusicType };

/* -------------------------------------------------------------------------- */

const YoutubeAtelier: React.FC<YoutubeAtelierProps> = ({ fetchTracks }) => {
  /* ------------------------------ STATES --------------------------------- */
  const [youtubeUsername, setYoutubeUsername] = useState('');
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [hideImported, setHideImported] = useState(false);
  const [maxResults, setMaxResults] = useState(25);
  const [youtubeSearchTerm, setYoutubeSearchTerm] = useState('');
  const [filteredYoutubeVideos, setFilteredYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [currentVideoForImport, setCurrentVideoForImport] = useState<YouTubeVideo | null>(null);
  const [verifyFormData, setVerifyFormData] = useState<Omit<Track, 'id'> & { id?: string }>(
    emptyTrackForm
  );
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  /* ----------------------------------------------------------------------- */

  /* ---------------------------- API YOUTUBE ------------------------------ */
  const fetchYouTubeVideos = async () => {
    if (!youtubeUsername.trim()) return;
    setIsLoadingVideos(true);
    setYoutubeError(null);
    setYoutubeVideos([]);
    try {
      const url = `/api/youtube?q=${encodeURIComponent(youtubeUsername)}&maxResults=${maxResults}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setYoutubeVideos(data.videos || []);
      else setYoutubeError(`Erreur: ${data.error || 'Impossible de récupérer les vidéos'}`);
    } catch (err) {
      console.error(err);
      setYoutubeError("Une erreur s'est produite lors de la récupération des vidéos");
    } finally {
      setIsLoadingVideos(false);
    }
  };
  /* ----------------------------------------------------------------------- */

  /* ------------------------- FILTRAGE LOCAL ------------------------------ */
  useEffect(() => {
    let vids = [...youtubeVideos];
    if (youtubeSearchTerm)
      vids = vids.filter((v) => v.title.toLowerCase().includes(youtubeSearchTerm.toLowerCase()));
    if (hideImported) vids = vids.filter((v) => !v.exists);
    setFilteredYoutubeVideos(vids);
  }, [youtubeVideos, youtubeSearchTerm, hideImported]);
  /* ----------------------------------------------------------------------- */

  /* ---------------------- WORKFLOW D'IMPORT ------------------------------ */
  const startVerificationProcess = () => {
    setVerifyIndex(0);
    processNextVideo();
  };
  const processNextVideo = () => {
    if (verifyIndex >= selectedVideos.length) {
      setShowVerifyModal(false);
      fetchTracks?.();
      youtubeUsername && fetchYouTubeVideos();
      setSelectedVideos([]);
      toast.success('Importation terminée');
      return;
    }
    const id = selectedVideos[verifyIndex];
    const video = youtubeVideos.find((v) => v.id === id);
    if (!video) {
      setVerifyIndex((i) => i + 1);
      return processNextVideo();
    }
    const { bpm, genres } = extractInfoFromTitle(video.title);
    setCurrentVideoForImport(video);
    setVerifyFormData({
      ...emptyTrackForm,
      title: video.title,
      releaseDate: video.publishedAt,
      bpm,
      genre: genres,
      type: genres.includes('Live')
        ? 'live'
        : genres.includes('Remix')
          ? 'remix'
          : genres.includes('DJ Set')
            ? 'djset'
            : 'video',
      platforms: {
        youtube: { url: `https://www.youtube.com/watch?v=${video.id}`, embedId: video.id },
      },
    });
    setShowVerifyModal(true);
  };
  const confirmVideoImport = async () => {
    if (!currentVideoForImport) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verifyFormData,
          genreNames: verifyFormData.genre,
          platforms: [
            {
              platform: 'youtube',
              url: verifyFormData.platforms.youtube!.url,
              embedId: currentVideoForImport.id,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setVerifyIndex((i) => i + 1);
      setIsSubmitting(false);
      processNextVideo();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ajout de la vidéo");
      setIsSubmitting(false);
    }
  };
  const skipCurrentVideo = () => {
    setVerifyIndex((i) => i + 1);
    processNextVideo();
  };
  const toggleVideoSelection = (id: string) =>
    setSelectedVideos((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  /* ----------------------------------------------------------------------- */

  /* ------------------------------ RENDER --------------------------------- */
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h2 className="text-xl font-bold mb-6 text-white">Atelier d'ajout intelligent YouTube</h2>
        <p className="text-gray-300 mb-6">
          Retrouvez vos vidéos YouTube et importez-les directement dans votre base de données
          musicale. Le système détecte automatiquement celles déjà présentes.
        </p>
        {/* zone de recherche */}
        <div className="flex items-end gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="yt" className="block text-gray-300 font-medium mb-2">
              Nom d'utilisateur / URL de chaîne
            </label>
            <input
              id="yt"
              value={youtubeUsername}
              onChange={(e) => setYoutubeUsername(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
              placeholder="https://www.youtube.com/@DJLarian"
            />
          </div>
          <button
            onClick={fetchYouTubeVideos}
            disabled={isLoadingVideos || !youtubeUsername}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isLoadingVideos ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" /> Rechercher
              </>
            )}
          </button>
        </div>
        {/* Erreur éventuelle */}
        {youtubeError && (
          <div className="p-4 mb-6 bg-red-900/30 border border-red-700/50 rounded-lg text-red-200 flex gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{youtubeError}</p>
          </div>
        )}
        {/* Options de filtrage */}
        {!!youtubeVideos.length && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* filtre texte */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                placeholder="Filtrer…"
                value={youtubeSearchTerm}
                onChange={(e) => setYoutubeSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
              />
            </div>
            {/* masquer importés */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideImported}
                  onChange={() => setHideImported(!hideImported)}
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
            {/* nombre résultats */}
            <div className="flex items-center gap-2">
              <label htmlFor="maxR" className="text-sm text-gray-300">
                Afficher :
              </label>
              <select
                id="maxR"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1 text-white focus:ring-purple-500 text-sm"
              >
                {[10, 25, 50, 100].map((v: number) => (
                  <option key={v} value={v}>
                    {v} vidéos
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {/* Liste vidéos */}
        {!!youtubeVideos.length && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">
                {filteredYoutubeVideos.length} vidéos trouvées
              </h3>
              <button
                onClick={startVerificationProcess}
                disabled={isSubmitting || !selectedVideos.length}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Import…
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Importer la sélection ({selectedVideos.length})
                  </>
                )}
              </button>
            </div>
            <div className="space-y-4">
              {filteredYoutubeVideos.slice(0, maxResults).map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    v.exists
                      ? 'bg-green-900/20 border-green-700/50 text-green-200'
                      : selectedVideos.includes(v.id)
                        ? 'bg-purple-900/30 border-purple-700/50'
                        : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60'
                  }`}
                >
                  {/* Bouton de sélection vidéo, accessible clavier */}
                  {!v.exists && (
                    <button
                      onClick={() => toggleVideoSelection(v.id)}
                      className={`p-2 rounded-md ${selectedVideos.includes(v.id) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      aria-label={
                        selectedVideos.includes(v.id)
                          ? 'Désélectionner la vidéo'
                          : 'Sélectionner la vidéo'
                      }
                      tabIndex={0}
                    >
                      {selectedVideos.includes(v.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div className="w-20 h-16 flex-shrink-0 rounded-md overflow-hidden">
                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-medium truncate"
                      dangerouslySetInnerHTML={{ __html: v.title }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300">
                        {new Date(v.publishedAt).toLocaleDateString()}
                      </span>
                      {v.exists && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-700/50 text-green-200">
                          Déjà importé
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                    title="Voir sur YouTube"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Modale de vérification */}
        {showVerifyModal && currentVideoForImport && (
          <Modal
            maxWidth="max-w-3xl"
            showLoader={false}
            bgClass="bg-gray-800"
            borderClass="border-gray-700"
            onClose={() => setShowVerifyModal(false)}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  Vérifier ({verifyIndex + 1}/{selectedVideos.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* aperçu vidéo */}
                <div>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                    <img
                      src={currentVideoForImport.thumbnail}
                      alt={currentVideoForImport.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${currentVideoForImport.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline text-sm flex items-center gap-1"
                  >
                    Voir sur YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {/* formulaire vérif */}
                <div className="md:col-span-2 space-y-4">
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
                      <input
                        type="date"
                        value={verifyFormData.releaseDate}
                        onChange={(e) =>
                          setVerifyFormData({ ...verifyFormData, releaseDate: e.target.value })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
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
                  {/* BPM */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">BPM</label>
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
                  {/* Description */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-1">Description</label>
                    <textarea
                      value={verifyFormData.description || ''}
                      onChange={(e) =>
                        setVerifyFormData({ ...verifyFormData, description: e.target.value })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500 resize-none h-20"
                    />
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={skipCurrentVideo}
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
                        onClick={confirmVideoImport}
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

export default YoutubeAtelier;
