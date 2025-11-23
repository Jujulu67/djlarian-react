import { ExternalLink, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

import { DateTimeField } from '@/components/ui/DateTimeField';
import Modal from '@/components/ui/Modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DetectedRelease, PlatformSearchResult } from '@/lib/services/types';
import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import { extractPlatformId } from '@/lib/utils/music-service';
import { Track, MusicType } from '@/lib/utils/types';

type MusicTypeOption = { label: string; value: MusicType };

interface VerifyModalProps {
  show: boolean;
  onClose: () => void;
  currentRelease: DetectedRelease | null;
  verifyFormData: Omit<Track, 'id'> & { id?: string };
  onFormDataChange: (data: Omit<Track, 'id'> & { id?: string }) => void;
  verifyIndex: number;
  totalReleases: number;
  isSubmitting: boolean;
  isEnriching: boolean;
  isSearchingPlatforms: boolean;
  platformSearchResults: PlatformSearchResult;
  musicalKey: string | undefined;
  onMusicalKeyChange: (key: string | undefined) => void;
  spotifyOriginalData: {
    bpm?: number;
    key?: string;
    genres: string[];
  };
  onConfirm: () => void;
  onSkip: () => void;
}

export function VerifyModal({
  show,
  onClose,
  currentRelease,
  verifyFormData,
  onFormDataChange,
  verifyIndex,
  totalReleases,
  isSubmitting,
  isEnriching,
  isSearchingPlatforms,
  platformSearchResults,
  musicalKey,
  onMusicalKeyChange,
  spotifyOriginalData,
  onConfirm,
  onSkip,
}: VerifyModalProps) {
  const [genreInput, setGenreInput] = useState('');

  if (!show || !currentRelease) return null;

  const handleAddGenre = () => {
    if (genreInput.trim() && !verifyFormData.genre.includes(genreInput.trim())) {
      onFormDataChange({
        ...verifyFormData,
        genre: [...verifyFormData.genre, genreInput.trim()],
      });
      setGenreInput('');
    }
  };

  const handleRemoveGenre = (g: string) => {
    onFormDataChange({
      ...verifyFormData,
      genre: verifyFormData.genre.filter((x) => x !== g),
    });
  };

  const handlePlatformChange = (
    platform: 'spotify' | 'youtube' | 'soundcloud' | 'apple' | 'deezer',
    url: string
  ) => {
    const embedId = extractPlatformId(url, platform);
    onFormDataChange({
      ...verifyFormData,
      platforms: {
        ...verifyFormData.platforms,
        [platform]: {
          url,
          ...(embedId && { embedId }),
        },
      },
    });
  };

  // Vérifier si les données correspondent aux données originales de Spotify
  const bpmMatches =
    verifyFormData.bpm === spotifyOriginalData.bpm ||
    (!verifyFormData.bpm && !spotifyOriginalData.bpm);
  const keyMatches =
    musicalKey === spotifyOriginalData.key || (!musicalKey && !spotifyOriginalData.key);
  const genresMatch =
    verifyFormData.genre.length === spotifyOriginalData.genres.length &&
    verifyFormData.genre.every((g) => spotifyOriginalData.genres.includes(g)) &&
    spotifyOriginalData.genres.every((g) => verifyFormData.genre.includes(g));

  const hasSpotifyData =
    spotifyOriginalData.bpm || spotifyOriginalData.key || spotifyOriginalData.genres.length > 0;
  const shouldShowSpotifyData = hasSpotifyData && bpmMatches && keyMatches && genresMatch;

  return (
    <Modal
      maxWidth="max-w-4xl"
      showLoader={false}
      bgClass="bg-gray-800"
      borderClass="border-gray-700"
      onClose={onClose}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            Vérifier ({verifyIndex + 1}/{totalReleases})
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
            {currentRelease.imageUrl && (
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <Image
                  src={currentRelease.imageUrl}
                  alt={currentRelease.title}
                  fill
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Informations Spotify enrichies */}
            {shouldShowSpotifyData && (
              <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Données Spotify
                </h3>
                <div className="space-y-2 text-sm">
                  {spotifyOriginalData.bpm ? (
                    <div className="flex justify-between">
                      <span className="text-gray-400">BPM:</span>
                      <span className="text-white font-medium">{spotifyOriginalData.bpm}</span>
                    </div>
                  ) : null}
                  {spotifyOriginalData.key ? (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Clé:</span>
                      <span className="text-white font-medium">{spotifyOriginalData.key}</span>
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
            )}

            {(currentRelease.spotifyUrl ||
              currentRelease.soundcloudUrl ||
              currentRelease.youtubeUrl) && (
              <a
                href={
                  currentRelease.spotifyUrl ||
                  currentRelease.soundcloudUrl ||
                  currentRelease.youtubeUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {currentRelease.spotifyUrl
                  ? 'Voir sur Spotify'
                  : currentRelease.soundcloudUrl
                    ? 'Voir sur SoundCloud'
                    : 'Voir sur YouTube'}
              </a>
            )}

            {/* Afficher les plateformes trouvées */}
            {Object.keys(platformSearchResults).length > 0 && (
              <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <p className="text-xs text-green-200 mb-2 font-medium">Plateformes trouvées :</p>
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
                    onChange={(e) => onFormDataChange({ ...verifyFormData, title: e.target.value })}
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
                      onFormDataChange({ ...verifyFormData, artist: e.target.value })
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
                        onFormDataChange({
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
                        onFormDataChange({ ...verifyFormData, releaseDate: e.target.value })
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
                          handleAddGenre();
                        }
                      }}
                      className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-purple-500"
                      placeholder="Ajouter un genre"
                    />
                    <button
                      type="button"
                      onClick={handleAddGenre}
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
                        <button onClick={() => handleRemoveGenre(g)}>
                          <X className="w-3 h-3 ml-1" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="platforms" className="space-y-2">
                {/* Spotify */}
                <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                  <span className="text-sm text-gray-300 w-20">Spotify:</span>
                  <input
                    value={
                      verifyFormData.platforms?.spotify?.url || currentRelease.spotifyUrl || ''
                    }
                    onChange={(e) => handlePlatformChange('spotify', e.target.value)}
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
                {/* YouTube */}
                <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                  <span className="text-sm text-gray-300 w-20">YouTube:</span>
                  <input
                    value={verifyFormData.platforms?.youtube?.url || ''}
                    onChange={(e) => handlePlatformChange('youtube', e.target.value)}
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
                {/* SoundCloud */}
                <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                  <span className="text-sm text-gray-300 w-20">SoundCloud:</span>
                  <input
                    value={verifyFormData.platforms?.soundcloud?.url || ''}
                    onChange={(e) => handlePlatformChange('soundcloud', e.target.value)}
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
                {/* Apple Music */}
                <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                  <span className="text-sm text-gray-300 w-20">Apple Music:</span>
                  <input
                    value={verifyFormData.platforms?.apple?.url || ''}
                    onChange={(e) => handlePlatformChange('apple', e.target.value)}
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
                {/* Deezer */}
                <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded">
                  <span className="text-sm text-gray-300 w-20">Deezer:</span>
                  <input
                    value={verifyFormData.platforms?.deezer?.url || ''}
                    onChange={(e) => handlePlatformChange('deezer', e.target.value)}
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
                      {verifyFormData.bpm && verifyFormData.bpm === spotifyOriginalData.bpm && (
                        <span className="ml-2 text-xs text-green-400">✓ Spotify</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={verifyFormData.bpm || ''}
                      onChange={(e) =>
                        onFormDataChange({
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
                      onChange={(e) => onMusicalKeyChange(e.target.value || undefined)}
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
                      onFormDataChange({ ...verifyFormData, description: e.target.value })
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
                onClick={onSkip}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                disabled={isSubmitting}
              >
                Ignorer
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-800/60 hover:bg-red-700/60 text-white rounded-lg"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
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
  );
}
