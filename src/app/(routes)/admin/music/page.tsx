'use client';
import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Track, MusicPlatform, MusicType } from '@/lib/utils/types';
import { Button } from '@/components/ui';
import {
  Music,
  PlusCircle,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  RefreshCw,
  Calendar,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ImageCropModal from '@/components/ui/ImageCropModal';
import ImageDropzone from '@/components/ui/ImageDropzone';
import { extractPlatformId } from '@/lib/utils/music-service';
import { v4 as uuidv4 } from 'uuid';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { findOriginalImageUrl } from '@/lib/utils/findOriginalImageUrl';
import YoutubeAtelier from './components/YoutubeAtelier';
import { MUSIC_TYPES, emptyTrackForm } from '@/lib/utils/music-helpers';
import { PublicationStatusSelector } from '@/components/admin/PublicationStatusSelector';

/* -------------------------------------------------------------------------- */
/*       Constantes plateformes                                               */
/* -------------------------------------------------------------------------- */
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
type AdminMusicTab = 'tracks' | 'collections' | 'youtube';

/* Helper crop centré */
function centerAspectCropFn(w: number, h: number, a: number): CropType {
  return centerCrop(makeAspectCrop({ unit: '%', width: 100 }, a, w, h), w, h);
}

/* -------------------------------------------------------------------------- */
/*                       Composant principal                                  */
/* -------------------------------------------------------------------------- */
export default function AdminMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  /* ------------------------------ STATES --------------------------------- */
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<
    Omit<Track, 'id'> & { id?: string; imageId?: string | null }
  >({
    ...emptyTrackForm,
  });
  const [genreInput, setGenreInput] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [activeTab, setActiveTab] = useState<AdminMusicTab>('tracks');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [refreshingCoverId, setRefreshingCoverId] = useState<string | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ------ Image -------- */
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [cachedOriginalFile, setCachedOriginalFile] = useState<File | null>(null);
  const [imageToUploadId, setImageToUploadId] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageFileRef = useRef<File | null>(null);
  /* ----------------------------------------------------------------------- */

  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const successId = searchParams?.get('success');

  const [showSuccess, setShowSuccess] = useState(!!successId);

  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (isEditing && showSuccess) setShowSuccess(false);
  }, [isEditing, showSuccess]);

  const successTrackInList = successId && filteredTracks.some((t) => t.id === successId);

  /* ----------------------------------------------------------------------- */
  /*                AUTH / FETCH TRACKS                                      */
  /* ----------------------------------------------------------------------- */
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') return router.push('/login');
    if (session?.user?.role !== 'ADMIN') return router.push('/');
  }, [status, session, router]);

  // Compteur local pour savoir si c'est le premier fetch
  const fetchCountRef = useRef(0);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      fetchCountRef.current += 1;
      const res = await fetch('/api/music');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTracks(data);
    } catch (err) {
      console.error(err);
      toast.error('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && tracks.some((t) => t.id === editId)) {
      setHighlightedTrackId(editId);
      handleEdit(tracks.find((t) => t.id === editId)!);
    }
  }, [tracks]);

  /* ----------------------------------------------------------------------- */
  /*                          HANDLERS                                       */
  /* ----------------------------------------------------------------------- */
  const handleAddGenre = () => {
    if (genreInput.trim() && !currentForm.genre.includes(genreInput.trim())) {
      setCurrentForm({ ...currentForm, genre: [...currentForm.genre, genreInput.trim()] });
      setGenreInput('');
    }
  };
  const handleRemoveGenre = (g: string) =>
    setCurrentForm({ ...currentForm, genre: currentForm.genre.filter((x) => x !== g) });

  const handlePlatformChange = (p: MusicPlatform, url: string) => {
    const embedId = extractPlatformId(url, p);
    setCurrentForm({
      ...currentForm,
      platforms: { ...currentForm.platforms, [p]: url ? { url, embedId } : undefined },
    });
  };

  /* ------------------ IMAGE upload / crop util --------------------------- */
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    originalImageFileRef.current = file;
    setOriginalImageFile(file);
    setImageToUploadId(uuidv4());
    setUploadedImage(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  const handleReCrop = async () => {
    if (originalImageFile) {
      originalImageFileRef.current = originalImageFile;
      const url = URL.createObjectURL(originalImageFile);
      setUploadedImage(url);
      setImageToUploadId(uuidv4());
      setShowCropModal(true);
      return;
    }
    if (cachedOriginalFile) {
      originalImageFileRef.current = cachedOriginalFile;
      setOriginalImageFile(cachedOriginalFile);
      const localUrl = URL.createObjectURL(cachedOriginalFile);
      setUploadedImage(localUrl);
      setImageToUploadId(uuidv4());
      setShowCropModal(true);
      return;
    }
    if (currentForm.imageId) {
      try {
        const res = await fetch(`/uploads/${currentForm.imageId}-ori.jpg`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'original.jpg', { type: blob.type });
          originalImageFileRef.current = file;
          setOriginalImageFile(file);
          setCachedOriginalFile(file);
          const localUrl = URL.createObjectURL(file);
          setUploadedImage(localUrl);
          setImageToUploadId(uuidv4());
          setShowCropModal(true);
        }
      } catch {}
    }
  };

  const resetFileInput = () => fileInputRef.current && (fileInputRef.current.value = '');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) setCrop(centerAspectCropFn(naturalWidth, naturalHeight, 1));
  };

  const getCroppedBlob = async (
    image: HTMLImageElement,
    c: CropType,
    fileName: string,
    source: File | null
  ): Promise<{ croppedBlob: Blob | null; originalFile: File | null }> => {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const scaleX = c.unit === '%' ? imageWidth / 100 : 1;
    const scaleY = c.unit === '%' ? imageHeight / 100 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = (c.width ?? 0) * scaleX;
    canvas.height = (c.height ?? 0) * scaleY;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      (c.x ?? 0) * scaleX,
      (c.y ?? 0) * scaleY,
      (c.width ?? 0) * scaleX,
      (c.height ?? 0) * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve({ croppedBlob: blob, originalFile: source }),
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropValidated = (file: File, preview: string) => {
    setCroppedImageBlob(file);
    setCoverPreview(preview);
    setShowCropModal(false);
    resetFileInput();
  };

  const cancelCrop = () => {
    setShowCropModal(false);
    setUploadedImage(null);
    setCrop(undefined);
    resetFileInput();
    if (!croppedImageBlob && !coverPreview) {
      setOriginalImageFile(null);
      setCoverPreview('');
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file) return;
    originalImageFileRef.current = file;
    setOriginalImageFile(file);
    setImageToUploadId(uuidv4());
    setUploadedImage(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  /* ------------------------- CRUD Track ---------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageId = currentForm.imageId;
      // fichier original à utiliser pour l'upload (peut venir de 3 sources)
      const fileToSend = originalImageFile || originalImageFileRef.current || cachedOriginalFile;
      // upload image si besoin
      if (croppedImageBlob) {
        if (!imageToUploadId || !fileToSend) throw new Error('Image manquante');
        const fd = new FormData();
        fd.append('imageId', imageToUploadId);
        fd.append('croppedImage', croppedImageBlob, 'cover.jpg');
        fd.append('originalImage', fileToSend, fileToSend.name);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error('Upload image échoué');
        const { imageId: newId } = await upRes.json();
        imageId = newId;
      }

      const platformsArray = Object.entries(currentForm.platforms)
        .filter(([, v]) => v?.url)
        .map(([p, v]) => ({ platform: p as MusicPlatform, url: v!.url, embedId: v!.embedId }));

      if (!platformsArray.length) throw new Error('Au moins une plateforme est requise');

      const body = {
        ...currentForm,
        imageId,
        genreNames: currentForm.genre,
        platforms: platformsArray,
        publishAt: currentForm.publishAt
          ? new Date(currentForm.publishAt).toISOString()
          : undefined,
      };
      const url = isEditing ? `/api/music/${currentForm.id}` : '/api/music';
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur API');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (typeof window !== 'undefined' && window.location.search.includes('edit=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('edit');
        router.replace(url.pathname + url.search, { scroll: false });
      }
      fetchTracks();
      resetForm();
      setSuccessTrackId(currentForm.id ?? null);
      setTimeout(() => setSuccessTrackId(null), 3000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (t: Track) => {
    const plat: Track['platforms'] = {};
    Object.entries(t.platforms).forEach(([k, v]) => v?.url && (plat[k as MusicPlatform] = v));
    setCurrentForm({
      ...t,
      releaseDate: new Date(t.releaseDate).toISOString().split('T')[0],
      platforms: plat,
    });
    setCoverPreview(t.imageId ? `/uploads/${t.imageId}.jpg` : '');
    setIsEditing(true);
    setUploadedImage(null);
    setImageToUploadId(null);
    setHighlightedTrackId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    try {
      const res = await fetch(`/api/music/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Supprimé');
      fetchTracks();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const toggleFeatured = async (id: string, cur: boolean) => {
    try {
      const res = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, featured: !cur }),
      });
      if (!res.ok) throw new Error();
      setTracks((arr) => arr.map((t) => (t.id === id ? { ...t, featured: !cur } : t)));
    } catch {
      toast.error('Erreur mise à jour');
    }
  };

  const resetForm = () => {
    setCurrentForm({ ...emptyTrackForm });
    setCoverPreview('');
    setGenreInput('');
    setIsEditing(false);
    setCroppedImageBlob(null);
    setUploadedImage(null);
    setImageToUploadId(null);
    setHighlightedTrackId(null);
  };
  /* ----------------------------------------------------------------------- */

  /* -------------------- FILTER affichage --------------------------------- */
  useEffect(() => {
    const s = searchTerm.toLowerCase();
    setFilteredTracks(
      tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.artist.toLowerCase().includes(s) ||
          t.genre.some((g) => g.toLowerCase().includes(s))
      )
    );
  }, [searchTerm, tracks]);
  /* ----------------------------------------------------------------------- */

  /* ---------------------------- RENDER ----------------------------------- */
  const editingTrack = highlightedTrackId
    ? filteredTracks.find((tr) => tr.id === highlightedTrackId)
    : null;

  const successTrack = successId ? filteredTracks.find((t) => t.id === successId) : null;

  useEffect(() => {
    if (!successId) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.delete('success');
      router.replace(
        window.location.pathname + (params.toString() ? '?' + params.toString() : ''),
        { scroll: false }
      );
    }, 4000);
    return () => clearTimeout(timeout);
  }, [successId]);

  // --- Succès local ---
  const [successTrackId, setSuccessTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && successTrackId) setSuccessTrackId(null);
  }, [isEditing, successTrackId]);

  // Fonction utilitaire pour fetch l'originale avec plusieurs extensions
  const tryFetchOriginal = async (imageId: string) => {
    const exts = ['jpg', 'png', 'webp'];
    for (const ext of exts) {
      const url = `/uploads/${imageId}-ori.${ext}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `original.${ext}`, { type: blob.type });
          return file;
        }
      } catch (err) {
        // ignore
      }
    }
    return null;
  };

  // Gestion du cache image originale synchronisée sur imageId
  useEffect(() => {
    setOriginalImageFile(null);
    setCachedOriginalFile(null);
    setCroppedImageBlob(null);
    if (currentForm.imageId) {
      (async () => {
        const file = await tryFetchOriginal(currentForm.imageId as string);
        if (file) {
          setOriginalImageFile(file);
          setCachedOriginalFile(file);
        }
      })();
    }
  }, [currentForm.imageId]);

  const togglePublish = async (id: string, current: boolean | undefined) => {
    try {
      const res = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !current, publishAt: undefined }),
      });
      if (!res.ok) throw new Error();
      setTracks((arr) =>
        arr.map((t) => (t.id === id ? { ...t, isPublished: !current, publishAt: undefined } : t))
      );
    } catch {
      toast.error('Erreur publication');
    }
  };

  // Fonction utilitaire DRY pour l'état d'un morceau (priorité à la date planifiée future)
  const getTrackStatus = (track: Track) => {
    const now = new Date();
    if (track.publishAt && new Date(track.publishAt) > now) {
      return {
        label: `À publier le ${new Date(track.publishAt).toLocaleDateString()}`,
        className: 'bg-blue-900/40 text-blue-300',
      };
    }
    if (track.isPublished && (!track.publishAt || new Date(track.publishAt) <= now)) {
      return { label: 'Publié', className: 'bg-green-900/40 text-green-300' };
    }
    return { label: 'Brouillon', className: 'bg-yellow-900/40 text-yellow-300' };
  };

  if (isLoading)
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen pt-8 pb-16 px-4">
      {/* Affichage du bandeau/toast global si succès mais track non visible */}
      {successTrackId && !successTrackInList && (
        <div className="fixed left-1/2 z-50 -translate-x-1/2 top-[80px] bg-green-600/90 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-4 animate-highlight-ring transition-opacity duration-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-white animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2l4 -4m5 2a9 9 0 11-18 0a9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-bold text-lg">Succès !</div>
            <div className="text-sm">
              Le morceau « {filteredTracks.find((t) => t.id === successTrackId)?.title || '...'} » a
              bien été {isEditing ? 'modifié' : 'ajouté'}.
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Gestion de la musique</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-8">
          {(['tracks', 'collections', 'youtube'] as AdminMusicTab[]).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${
                activeTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'tracks'
                ? 'Morceaux'
                : tab === 'collections'
                  ? 'Collections'
                  : 'Atelier YouTube'}
            </button>
          ))}
        </div>

        {/* --------------------------------- TAB TRACKS -------------------------------- */}
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* -------- Formulaire -------- */}
            <div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Edit className="w-5 h-5" /> Modifier
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" /> Ajouter
                    </>
                  )}
                </h2>

                <form onSubmit={handleSubmit}>
                  {/* titre */}
                  <div className="mb-4">
                    <label className="block text-gray-300 font-medium mb-2">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={currentForm.title}
                      onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* type + date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentForm.type}
                        onChange={(e) =>
                          setCurrentForm({ ...currentForm, type: e.target.value as MusicType })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                      >
                        {MUSIC_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={currentForm.releaseDate}
                        onChange={(e) =>
                          setCurrentForm({ ...currentForm, releaseDate: e.target.value })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>

                  {/* genres */}
                  <div className="mt-4">
                    <label className="block text-gray-300 font-medium mb-2">Genres</label>
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
                        className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
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
                      {currentForm.genre.map((g) => (
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

                  {/* BPM + featured */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">BPM</label>
                      <input
                        type="number"
                        value={currentForm.bpm || ''}
                        onChange={(e) =>
                          setCurrentForm({
                            ...currentForm,
                            bpm: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                        placeholder="128"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Mise en avant</label>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentForm({ ...currentForm, featured: !currentForm.featured })
                        }
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg ${
                          currentForm.featured ? 'bg-yellow-600/80' : 'bg-gray-700'
                        }`}
                      >
                        <Star className="w-5 h-5" /> {currentForm.featured ? 'Oui' : 'Non'}
                      </button>
                    </div>
                  </div>

                  {/* image */}
                  <div className="mt-4">
                    <ImageDropzone
                      label="Pochette (carrée)"
                      imageUrl={coverPreview}
                      onDrop={handleImageUpload}
                      onRecrop={handleReCrop}
                      onRemove={() => {
                        setOriginalImageFile(null);
                        setCroppedImageBlob(null);
                        setCoverPreview('');
                        setCurrentForm({ ...currentForm, imageId: null });
                        setCachedOriginalFile(null);
                      }}
                      onFileSelected={handleFileSelected}
                      canRecrop={
                        !!originalImageFile || !!cachedOriginalFile || !!currentForm.imageId
                      }
                    />
                  </div>

                  {/* description */}
                  <div className="mt-4">
                    <label className="block text-gray-300 font-medium mb-2">Description</label>
                    <textarea
                      value={currentForm.description || ''}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, description: e.target.value })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 resize-none h-20"
                    />
                  </div>

                  {/* plateformes */}
                  <div className="mt-4">
                    <h3 className="text-white font-medium mb-3">Plateformes</h3>
                    <div className="space-y-3">
                      {(Object.keys(platformLabels) as MusicPlatform[]).map((p) => (
                        <div key={p} className="flex items-center gap-2">
                          <span className="w-8 flex justify-center">{platformIcons[p]}</span>
                          <input
                            type="url"
                            value={currentForm.platforms[p]?.url || ''}
                            onChange={(e) => handlePlatformChange(p, e.target.value)}
                            className="flex-1 bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-purple-500 text-sm"
                            placeholder={`URL ${platformLabels[p]}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* publication status */}
                  <div className="mt-4">
                    <PublicationStatusSelector
                      isPublished={currentForm.isPublished}
                      publishAt={currentForm.publishAt}
                      onChange={(status: 'published' | 'draft' | 'scheduled', date?: string) => {
                        if (status === 'published') {
                          setCurrentForm({
                            ...currentForm,
                            isPublished: true,
                            publishAt: undefined,
                          });
                        } else if (status === 'draft') {
                          setCurrentForm({
                            ...currentForm,
                            isPublished: false,
                            publishAt: undefined,
                          });
                        } else if (status === 'scheduled' && date) {
                          setCurrentForm({ ...currentForm, isPublished: false, publishAt: date });
                        }
                      }}
                    />
                  </div>

                  {/* boutons */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      type="submit"
                      className="flex-1 flex items-center gap-2"
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
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" /> Annuler
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* --------- Liste tracks --------- */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="w-5 h-5" /> Morceaux ({filteredTracks.length})
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      placeholder="Rechercher…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                {/* Bloc flottant En édition */}
                {editingTrack && (
                  <div className="mb-6">
                    <div
                      className={`relative bg-gray-900/80 rounded-xl border-2 border-purple-500/80 p-4 flex items-center gap-4 shadow-lg ${highlightedTrackId === editingTrack.id ? 'animate-highlight-ring ring-4 ring-purple-500/80' : ''}`}
                    >
                      <div className="absolute top-2 right-2 bg-purple-700/90 text-white text-xs px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                        En édition
                      </div>
                      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        {editingTrack.imageId ? (
                          <img
                            src={`/uploads/${editingTrack.imageId}.jpg?t=${editingTrack.updatedAt ? new Date(editingTrack.updatedAt).getTime() : Date.now()}`}
                            alt={editingTrack.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <Music className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{editingTrack.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
                            {MUSIC_TYPES.find((x) => x.value === editingTrack.type)?.label ||
                              editingTrack.type}
                          </span>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(editingTrack.releaseDate).toLocaleDateString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ml-2 ${getTrackStatus(editingTrack).className}`}
                          >
                            {getTrackStatus(editingTrack).label}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {Object.entries(editingTrack.platforms).map(
                            ([p, v]) =>
                              v?.url && (
                                <a
                                  key={p}
                                  href={v.url}
                                  target="_blank"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-gray-700/60 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white"
                                  title={platformLabels[p as MusicPlatform]}
                                >
                                  {platformIcons[p as MusicPlatform]}
                                </a>
                              )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFeatured(editingTrack.id, editingTrack.featured || false);
                          }}
                          className={`p-2 rounded-lg ${editingTrack.featured ? 'bg-yellow-600/80 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHighlightedTrackId(editingTrack.id);
                            handleEdit(editingTrack);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(editingTrack.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {/* Bouton refresh cover */}
                        <button
                          type="button"
                          className={`p-2 rounded-lg hover:bg-purple-700/30 text-purple-400 hover:text-white transition-colors ${refreshingCoverId === editingTrack.id ? 'opacity-50 cursor-wait' : ''}`}
                          title="Rafraîchir la cover"
                          disabled={refreshingCoverId === editingTrack.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setRefreshingCoverId(editingTrack.id);
                            try {
                              const res = await fetch(
                                `/api/music/${editingTrack.id}/refresh-cover`,
                                {
                                  method: 'POST',
                                }
                              );
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Erreur API');
                              setTracks((arr) =>
                                arr.map((track) =>
                                  track.id === editingTrack.id
                                    ? {
                                        ...track,
                                        imageId: data.imageId,
                                        updatedAt: new Date().toISOString(),
                                      }
                                    : track
                                )
                              );
                              toast.success('Cover rafraîchie !');
                            } catch (err) {
                              toast.error((err as any).message || 'Erreur lors du refresh cover');
                            } finally {
                              setRefreshingCoverId(null);
                            }
                          }}
                        >
                          {refreshingCoverId === editingTrack.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Liste normale, sans suppression du morceau en édition */}
                {!filteredTracks.length ? (
                  <div className="text-center py-12">
                    <Music className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">
                      {searchTerm ? 'Aucun résultat' : 'Aucun morceau'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTracks.map((t) => {
                      if (!t.id) {
                        return null;
                      }
                      if (t.id === successTrackId) {
                        return (
                          <div
                            key={t.id}
                            className="relative bg-green-900/80 rounded-xl border-2 border-green-500/80 p-4 flex items-center gap-4 animate-highlight-ring ring-4 ring-green-500/80 shadow-lg transition-all duration-500"
                          >
                            <div className="absolute top-2 right-2 bg-green-700/90 text-white text-xs px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                              Succès
                            </div>
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              {t.imageId ? (
                                <img
                                  src={`/uploads/${t.imageId}.jpg?t=${t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now()}`}
                                  alt={t.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-8 h-8 text-green-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 12l2 2l4 -4m5 2a9 9 0 11-18 0a9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-bold truncate flex items-center gap-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-6 h-6 text-green-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2l4 -4m5 2a9 9 0 11-18 0a9 9 0 0118 0z"
                                  />
                                </svg>
                                {t.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-200">
                                  {MUSIC_TYPES.find((x) => x.value === t.type)?.label || t.type}
                                </span>
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(t.releaseDate).toLocaleDateString()}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ml-2 ${getTrackStatus(t).className}`}
                                >
                                  {getTrackStatus(t).label}
                                </span>
                              </div>
                              <div className="flex gap-1 mt-2">
                                {Object.entries(t.platforms).map(
                                  ([p, v]) =>
                                    v?.url && (
                                      <a
                                        key={p}
                                        href={v.url}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-green-700/60 hover:bg-green-600 rounded-full text-green-300 hover:text-white"
                                        title={platformLabels[p as MusicPlatform]}
                                      >
                                        {platformIcons[p as MusicPlatform]}
                                      </a>
                                    )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      // Ancienne card normale
                      return (
                        <div
                          key={t.id}
                          ref={(el) => {
                            trackRefs.current[t.id] = el;
                          }}
                          className={`bg-gray-800/40 hover:bg-gray-800/60 rounded-lg border border-gray-700/30 cursor-pointer transition-colors`}
                          onClick={() => {
                            if (t.id) {
                              router.push(`/admin/music/${t.id}/detail`, { scroll: false });
                            }
                          }}
                        >
                          <div className="flex items-center gap-4 p-4">
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              {t.imageId ? (
                                <img
                                  src={`/uploads/${t.imageId}.jpg?t=${t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now()}`}
                                  alt={t.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <Music className="w-8 h-8 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium truncate">{t.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
                                  {MUSIC_TYPES.find((x) => x.value === t.type)?.label || t.type}
                                </span>
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(t.releaseDate).toLocaleDateString()}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ml-2 ${getTrackStatus(t).className}`}
                                >
                                  {getTrackStatus(t).label}
                                </span>
                              </div>
                              <div className="flex gap-1 mt-2">
                                {Object.entries(t.platforms).map(
                                  ([p, v]) =>
                                    v?.url && (
                                      <a
                                        key={p}
                                        href={v.url}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-gray-700/60 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white"
                                        title={platformLabels[p as MusicPlatform]}
                                      >
                                        {platformIcons[p as MusicPlatform]}
                                      </a>
                                    )
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFeatured(t.id, t.featured || false);
                                }}
                                className={`p-2 rounded-lg ${t.featured ? 'bg-yellow-600/80 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                <Star className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHighlightedTrackId(t.id);
                                  handleEdit(t);
                                }}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(t.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                              {/* Bouton refresh cover */}
                              <button
                                type="button"
                                className={`p-2 rounded-lg hover:bg-purple-700/30 text-purple-400 hover:text-white transition-colors ${refreshingCoverId === t.id ? 'opacity-50 cursor-wait' : ''}`}
                                title="Rafraîchir la cover"
                                disabled={refreshingCoverId === t.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setRefreshingCoverId(t.id);
                                  try {
                                    const res = await fetch(`/api/music/${t.id}/refresh-cover`, {
                                      method: 'POST',
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'Erreur API');
                                    setTracks((arr) =>
                                      arr.map((track) =>
                                        track.id === t.id
                                          ? {
                                              ...track,
                                              imageId: data.imageId,
                                              updatedAt: new Date().toISOString(),
                                            }
                                          : track
                                      )
                                    );
                                    toast.success('Cover rafraîchie !');
                                  } catch (err) {
                                    toast.error(
                                      (err as any).message || 'Erreur lors du refresh cover'
                                    );
                                  } finally {
                                    setRefreshingCoverId(null);
                                  }
                                }}
                              >
                                {refreshingCoverId === t.id ? (
                                  <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-5 h-5" />
                                )}
                              </button>
                              {/* Action rapide œil */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await togglePublish(t.id, t.isPublished);
                                }}
                                className={`p-2 rounded-lg transition-colors border-none outline-none ring-0 focus:ring-0 focus:outline-none shadow-none focus:shadow-none ${
                                  t.isPublished
                                    ? 'bg-green-600/80 hover:bg-green-500/80 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }`}
                                title={t.isPublished ? 'Dépublier' : 'Publier'}
                                tabIndex={0}
                                aria-label={t.isPublished ? 'Dépublier' : 'Publier'}
                              >
                                {t.isPublished ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------- TAB COLLECTIONS ------------------------- */}
        {activeTab === 'collections' && (
          <div className="text-center py-12 text-gray-400">Gestion des collections à venir…</div>
        )}

        {/* --------------------------------- TAB YOUTUBE ----------------------------- */}
        {activeTab === 'youtube' && <YoutubeAtelier fetchTracks={fetchTracks} />}

        {/* ------------------ Modal crop ------------------------------------------- */}
        {showCropModal && uploadedImage && (
          <ImageCropModal
            imageToEdit={uploadedImage}
            aspect={1}
            title="Recadrer l'image"
            cropLabel="Appliquer"
            cancelLabel="Annuler"
            onCrop={handleCropValidated}
            onCancel={cancelCrop}
          />
        )}
      </div>
    </div>
  );
}
