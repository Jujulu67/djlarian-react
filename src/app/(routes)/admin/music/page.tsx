'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Track, MusicType, MusicPlatform } from '@/lib/utils/types';
import { Button } from '@/components/ui';
import { extractPlatformId, getYouTubeThumbnail } from '@/lib/utils/music-service';
import {
  Music,
  PlusCircle,
  Edit,
  Trash2,
  Save,
  X,
  ExternalLink,
  Search,
  RefreshCw,
  Upload,
  Calendar,
  ListFilter,
} from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const platformLabels: Record<MusicPlatform, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  apple: 'Apple Music',
  deezer: 'Deezer',
};

const platformIcons: Record<MusicPlatform, React.ReactNode> = {
  spotify: <FaSpotify className="w-5 h-5" />,
  youtube: <FaYoutube className="w-5 h-5" />,
  soundcloud: <FaSoundcloud className="w-5 h-5" />,
  apple: <FaApple className="w-5 h-5" />,
  deezer: <FaMusic className="w-5 h-5" />,
};

// Types musicaux disponibles
const MUSIC_TYPES: { label: string; value: MusicType }[] = [
  { label: 'Single', value: 'single' },
  { label: 'EP/Album', value: 'ep' },
  { label: 'Remix', value: 'remix' },
  { label: 'DJ Set', value: 'djset' },
  { label: 'Live', value: 'live' },
  { label: 'Video', value: 'video' },
];

// Formulaire vide par défaut
const emptyTrackForm: Omit<Track, 'id'> & { id?: string } = {
  title: '',
  artist: 'DJ Larian',
  coverUrl: '',
  releaseDate: new Date().toISOString().split('T')[0],
  genre: [],
  type: 'single',
  description: '',
  featured: false,
  platforms: {},
};

export default function AdminMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<Omit<Track, 'id'> & { id?: string }>(
    emptyTrackForm
  );
  const [genreInput, setGenreInput] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'tracks' | 'collections'>('tracks');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

  // Vérifier l'authentification
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  // Charger les morceaux depuis l'API
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTracks();
    }
  }, [status]);

  // Filtrer les morceaux
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTracks(tracks);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredTracks(
        tracks.filter(
          (track) =>
            track.title.toLowerCase().includes(term) ||
            track.artist.toLowerCase().includes(term) ||
            track.genre.some((g) => g.toLowerCase().includes(term)) ||
            track.type.includes(term)
        )
      );
    }
  }, [searchTerm, tracks]);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/music');
      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }
      const data = await response.json();
      setTracks(data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler pour ajouter un genre
  const handleAddGenre = () => {
    if (genreInput.trim() && !currentForm.genre.includes(genreInput.trim())) {
      setCurrentForm({
        ...currentForm,
        genre: [...currentForm.genre, genreInput.trim()],
      });
      setGenreInput('');
    }
  };

  // Handler pour supprimer un genre
  const handleRemoveGenre = (genreToRemove: string) => {
    setCurrentForm({
      ...currentForm,
      genre: currentForm.genre.filter((g) => g !== genreToRemove),
    });
  };

  // Handler pour mettre à jour une URL de plateforme
  const handlePlatformChange = (platform: MusicPlatform, url: string) => {
    // Extraire ID si possible
    const embedId = extractPlatformId(url, platform);

    setCurrentForm({
      ...currentForm,
      platforms: {
        ...currentForm.platforms,
        [platform]: url ? { url, embedId: embedId || undefined } : undefined,
      },
    });

    // Si c'est YouTube et qu'il n'y a pas de couverture, extraire la vignette
    if (platform === 'youtube' && embedId && !currentForm.coverUrl) {
      const thumbnail = getYouTubeThumbnail(url);
      if (thumbnail) {
        setCurrentForm((prev) => ({ ...prev, coverUrl: thumbnail }));
        setCoverPreview(thumbnail);
      }
    }
  };

  // Handler pour soumettre le formulaire
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Préparer les données à envoyer à l'API
      const platformsArray = Object.entries(currentForm.platforms || {})
        .filter(([_, value]) => value && value.url)
        .map(([platform, data]) => ({
          platform: platform as MusicPlatform,
          url: data!.url,
          embedId: data!.embedId,
        }));

      const apiData = {
        ...currentForm,
        genreNames: currentForm.genre,
        platforms: platformsArray,
      };

      let response;

      if (isEditing && currentForm.id) {
        // Mise à jour
        response = await fetch('/api/music', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        });
      } else {
        // Création
        response = await fetch('/api/music', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save track');
      }

      // Rafraîchir la liste
      await fetchTracks();

      // Afficher un message de succès
      toast.success(isEditing ? 'Track updated successfully' : 'Track created successfully');

      // Réinitialiser le formulaire
      resetForm();
    } catch (error) {
      console.error('Error saving track:', error);
      toast.error(isEditing ? 'Failed to update track' : 'Failed to create track');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler pour modifier un morceau
  const handleEdit = (track: Track) => {
    setCurrentForm(track);
    setCoverPreview(track.coverUrl);
    setIsEditing(true);
  };

  // Handler pour supprimer un morceau
  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce morceau ?')) {
      try {
        const response = await fetch(`/api/music?id=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete track');
        }

        // Rafraîchir la liste
        await fetchTracks();

        // Afficher un message de succès
        toast.success('Track deleted successfully');
      } catch (error) {
        console.error('Error deleting track:', error);
        toast.error('Failed to delete track');
      }
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCurrentForm(emptyTrackForm);
    setCoverPreview('');
    setGenreInput('');
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Gestion de la musique</h1>

        {/* Onglets */}
        <div className="flex border-b border-gray-700 mb-8">
          <button
            className={`px-4 py-2 font-medium text-sm focus:outline-none ${
              activeTab === 'tracks'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('tracks')}
          >
            Morceaux
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm focus:outline-none ${
              activeTab === 'collections'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('collections')}
          >
            Collections
          </button>
        </div>

        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulaire */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Edit className="w-5 h-5" />
                      Modifier un morceau
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      Ajouter un morceau
                    </>
                  )}
                </h2>

                <form onSubmit={handleSubmit}>
                  {/* Titre */}
                  <div className="mb-4">
                    <label htmlFor="title" className="block text-gray-300 font-medium mb-2">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={currentForm.title}
                      onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="mb-4">
                    <label htmlFor="type" className="block text-gray-300 font-medium mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="type"
                      value={currentForm.type}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, type: e.target.value as MusicType })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      {MUSIC_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date de sortie */}
                  <div className="mb-4">
                    <label htmlFor="releaseDate" className="block text-gray-300 font-medium mb-2">
                      Date de sortie <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="releaseDate"
                      value={currentForm.releaseDate}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, releaseDate: e.target.value })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* Genres */}
                  <div className="mb-4">
                    <label htmlFor="genre" className="block text-gray-300 font-medium mb-2">
                      Genres
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        id="genre"
                        value={genreInput}
                        onChange={(e) => setGenreInput(e.target.value)}
                        className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Entrez un genre"
                      />
                      <button
                        type="button"
                        onClick={handleAddGenre}
                        className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentForm.genre.map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-600/30 text-purple-200"
                        >
                          {genre}
                          <button
                            type="button"
                            onClick={() => handleRemoveGenre(genre)}
                            className="ml-2 text-purple-300 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* BPM */}
                  <div className="mb-4">
                    <label htmlFor="bpm" className="block text-gray-300 font-medium mb-2">
                      BPM
                    </label>
                    <input
                      type="number"
                      id="bpm"
                      value={currentForm.bpm || ''}
                      onChange={(e) =>
                        setCurrentForm({
                          ...currentForm,
                          bpm: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: 128"
                    />
                  </div>

                  {/* Cover URL */}
                  <div className="mb-4">
                    <label htmlFor="coverUrl" className="block text-gray-300 font-medium mb-2">
                      URL de la couverture
                    </label>
                    <input
                      type="url"
                      id="coverUrl"
                      value={currentForm.coverUrl || ''}
                      onChange={(e) => {
                        setCurrentForm({ ...currentForm, coverUrl: e.target.value });
                        setCoverPreview(e.target.value);
                      }}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://..."
                    />
                    {coverPreview && (
                      <div className="mt-2">
                        <img
                          src={coverPreview}
                          alt="Aperçu"
                          className="w-32 h-32 object-cover rounded-lg"
                          onError={() => setCoverPreview('')}
                        />
                      </div>
                    )}
                  </div>

                  {/* Featured */}
                  <div className="mb-4 flex items-center">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={currentForm.featured || false}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, featured: e.target.checked })
                      }
                      className="w-5 h-5 bg-gray-700 border-gray-600 rounded"
                    />
                    <label htmlFor="featured" className="ml-2 text-gray-300">
                      Mettre en avant
                    </label>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-gray-300 font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={currentForm.description || ''}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, description: e.target.value })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                      placeholder="Description du morceau..."
                    />
                  </div>

                  {/* Plateformes */}
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-3">Plateformes</h3>

                    {(Object.keys(platformLabels) as MusicPlatform[]).map((platform) => (
                      <div key={platform} className="mb-3">
                        <label className="flex items-center gap-2 text-gray-300 text-sm mb-1">
                          {platformIcons[platform]}
                          {platformLabels[platform]}
                        </label>
                        <input
                          type="url"
                          value={currentForm.platforms[platform]?.url || ''}
                          onChange={(e) => handlePlatformChange(platform, e.target.value)}
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder={`URL ${platformLabels[platform]}...`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isEditing ? 'Mettre à jour' : 'Ajouter'}
                    </Button>

                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Liste des morceaux */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Morceaux ({filteredTracks.length})
                  </h2>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                {filteredTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">
                      {searchTerm ? 'Aucun résultat trouvé' : 'Aucun morceau disponible'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 p-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-lg border border-gray-700/30 transition-colors"
                      >
                        {/* Image */}
                        <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <Music className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{track.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
                              {MUSIC_TYPES.find((t) => t.value === track.type)?.label || track.type}
                            </span>
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(track.releaseDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Plateformes disponibles */}
                          <div className="flex gap-1 mt-2">
                            {Object.entries(track.platforms).map(
                              ([platform, data]) =>
                                data?.url && (
                                  <a
                                    key={platform}
                                    href={data.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-700/60 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white transition-colors"
                                    title={`Voir sur ${platformLabels[platform as MusicPlatform]}`}
                                  >
                                    {platformIcons[platform as MusicPlatform]}
                                  </a>
                                )
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(track)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(track.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <ListFilter className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p>La gestion des collections sera disponible prochainement</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
