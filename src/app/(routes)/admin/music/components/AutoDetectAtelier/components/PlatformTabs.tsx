import { RefreshCw, Search } from 'lucide-react';
import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlatformTabsProps {
  activeTab: 'spotify' | 'soundcloud' | 'youtube';
  onTabChange: (tab: 'spotify' | 'soundcloud' | 'youtube') => void;
  isLoading: boolean;
  hasReleases: boolean;
  // Spotify
  spotifyArtistId: string;
  onSpotifyArtistIdChange: (value: string) => void;
  spotifyArtistName: string;
  onSpotifyArtistNameChange: (value: string) => void;
  onSpotifyFetch: (forceRefresh?: boolean) => void;
  // SoundCloud
  soundcloudArtistName: string;
  onSoundcloudArtistNameChange: (value: string) => void;
  soundcloudProfileUrl: string;
  onSoundcloudProfileUrlChange: (value: string) => void;
  onSoundcloudFetch: (forceRefresh?: boolean) => void;
  // YouTube
  youtubeUsername: string;
  onYoutubeUsernameChange: (value: string) => void;
  maxResults: number;
  onMaxResultsChange: (value: number) => void;
  onYoutubeFetch: (forceRefresh?: boolean) => void;
}

export function PlatformTabs({
  activeTab,
  onTabChange,
  isLoading,
  hasReleases,
  spotifyArtistId,
  onSpotifyArtistIdChange,
  spotifyArtistName,
  onSpotifyArtistNameChange,
  onSpotifyFetch,
  soundcloudArtistName,
  onSoundcloudArtistNameChange,
  soundcloudProfileUrl,
  onSoundcloudProfileUrlChange,
  onSoundcloudFetch,
  youtubeUsername,
  onYoutubeUsernameChange,
  maxResults,
  onMaxResultsChange,
  onYoutubeFetch,
}: PlatformTabsProps) {
  const handleValueChange = (value: string) => {
    if (value === 'spotify' || value === 'youtube' || value === 'soundcloud') {
      onTabChange(value);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange} className="w-full">
      <TabsList className="grid w-full bg-gray-700/50 mb-6 grid-cols-3">
        <TabsTrigger value="spotify" className="data-[state=active]:bg-purple-600">
          Spotify
        </TabsTrigger>
        <TabsTrigger value="soundcloud" className="data-[state=active]:bg-purple-600">
          SoundCloud
        </TabsTrigger>
        <TabsTrigger value="youtube" className="data-[state=active]:bg-purple-600">
          YouTube
        </TabsTrigger>
      </TabsList>

      {/* Onglet Spotify */}
      <TabsContent value="spotify" className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSpotifyFetch();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="artistId" className="block text-gray-300 font-medium mb-2">
                Spotify Artist ID
              </label>
              <input
                id="artistId"
                value={spotifyArtistId}
                onChange={(e) => onSpotifyArtistIdChange(e.target.value)}
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
                value={spotifyArtistName}
                onChange={(e) => onSpotifyArtistNameChange(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: Larian"
              />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              disabled={isLoading || (!spotifyArtistId.trim() && !spotifyArtistName.trim())}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rechercher les releases
                </>
              )}
            </button>
            {hasReleases && (
              <button
                type="button"
                onClick={() => onSpotifyFetch(true)}
                disabled={isLoading}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 self-start"
                title="Forcer le refresh (ignorer le cache)"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            )}
          </div>
        </form>
      </TabsContent>

      {/* Onglet SoundCloud */}
      <TabsContent value="soundcloud" className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSoundcloudFetch();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="soundcloudArtistName"
                className="block text-gray-300 font-medium mb-2"
              >
                Nom d&apos;artiste SoundCloud
              </label>
              <input
                id="soundcloudArtistName"
                value={soundcloudArtistName}
                onChange={(e) => onSoundcloudArtistNameChange(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: Larian"
              />
            </div>
            <div>
              <label
                htmlFor="soundcloudProfileUrl"
                className="block text-gray-300 font-medium mb-2"
              >
                Ou URL de profil SoundCloud
              </label>
              <input
                id="soundcloudProfileUrl"
                value={soundcloudProfileUrl}
                onChange={(e) => onSoundcloudProfileUrlChange(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: soundcloud.com/larian"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL complète ou juste le nom d&apos;utilisateur
              </p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              disabled={isLoading || (!soundcloudArtistName.trim() && !soundcloudProfileUrl.trim())}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rechercher les tracks
                </>
              )}
            </button>
            {hasReleases && (
              <button
                type="button"
                onClick={() => onSoundcloudFetch(true)}
                disabled={isLoading}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                title="Forcer le refresh (ignorer le cache)"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            )}
          </div>
        </form>
      </TabsContent>

      {/* Onglet YouTube */}
      <TabsContent value="youtube" className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onYoutubeFetch();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="youtubeUsername" className="block text-gray-300 font-medium mb-2">
                Nom d&apos;utilisateur / URL de chaîne YouTube
              </label>
              <input
                id="youtubeUsername"
                value={youtubeUsername}
                onChange={(e) => onYoutubeUsernameChange(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                placeholder="Ex: https://www.youtube.com/@DJLarian"
              />
            </div>
            <div>
              <label htmlFor="maxResults" className="block text-gray-300 font-medium mb-2">
                Nombre de résultats
              </label>
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => onMaxResultsChange(parseInt(e.target.value))}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
              >
                <option value={10}>10 vidéos</option>
                <option value={25}>25 vidéos</option>
                <option value={50}>50 vidéos</option>
                <option value={100}>100 vidéos</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              disabled={isLoading || !youtubeUsername.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rechercher les vidéos
                </>
              )}
            </button>
            {hasReleases && (
              <button
                type="button"
                onClick={() => onYoutubeFetch(true)}
                disabled={isLoading}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                title="Forcer le refresh (ignorer le cache)"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            )}
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}
