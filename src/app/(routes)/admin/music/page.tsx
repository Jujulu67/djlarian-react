'use client';

import React, { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
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
  Star,
  ImageIcon,
  Crop,
  Youtube,
  Check,
  Plus,
  AlertCircle,
  Info,
} from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Link from 'next/link';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Helper function to center the crop area with a specific aspect ratio
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): CropType {
  return centerCrop(
    makeAspectCrop(
      {
        // Utiliser 100% pour maximiser la zone
        unit: '%',
        width: 100,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

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

// Formulaire vide par défaut (Utiliser imageId)
const emptyTrackForm: Omit<Track, 'id'> & { id?: string } = {
  title: '',
  artist: 'DJ Larian',
  imageId: undefined, // Utiliser undefined ou null si optionnel
  releaseDate: new Date().toISOString().split('T')[0],
  genre: [],
  type: 'single',
  description: '',
  featured: false,
  platforms: {},
  isPublished: true,
  bpm: undefined,
  collection: undefined,
  user: undefined,
  createdAt: undefined,
  updatedAt: undefined,
};

// Interface pour les vidéos YouTube
interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  exists: boolean; // Si la vidéo existe déjà dans la base de données
}

// Type pour le menu d'onglets
type AdminMusicTab = 'tracks' | 'collections' | 'youtube';

// Fonction pour extraire des informations supplémentaires du titre
function extractInfoFromTitle(title: string) {
  const result = {
    cleanTitle: title,
    bpm: undefined as number | undefined,
    genres: [] as string[],
  };

  // Nettoyer les caractères spéciaux/HTML entities dans le titre
  let cleanTitle = title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Essayer de détecter le BPM dans le titre
  const bpmMatch =
    cleanTitle.match(/\b(\d{2,3})\s*(?:bpm|BPM)\b/) ||
    cleanTitle.match(/\[(\d{2,3})\]/) ||
    cleanTitle.match(/\((\d{2,3})\s*(?:bpm|BPM)\)/);

  if (bpmMatch && bpmMatch[1]) {
    const detectedBpm = parseInt(bpmMatch[1]);
    if (detectedBpm >= 70 && detectedBpm <= 200) {
      result.bpm = detectedBpm;
    }
  }

  // Extraire des genres potentiels à partir du titre
  const genreKeywords = [
    'House',
    'Tech House',
    'Deep House',
    'Progressive House',
    'Future House',
    'Techno',
    'Melodic Techno',
    'Hard Techno',
    'Industrial Techno',
    'Trance',
    'Progressive Trance',
    'Uplifting Trance',
    'Psytrance',
    'Drum & Bass',
    'DnB',
    'Jungle',
    'Dubstep',
    'Trap',
    'Future Bass',
    'Ambient',
    'Chill',
    'Lo-Fi',
    'EDM',
    'Electronic',
    'Electronica',
    'Hardstyle',
    'Hardcore',
    'Gabber',
    'Disco',
    'Nu Disco',
    'Funk',
    'Breakbeat',
    'Big Beat',
    'Breaks',
    'Downtempo',
    'Trip Hop',
    'Chillout',
  ];

  // Vérifier si des mots-clés de genre sont présents dans le titre
  for (const genre of genreKeywords) {
    const regex = new RegExp(`\\b${genre.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(cleanTitle)) {
      result.genres.push(genre);
    }
  }

  // Détecter les types spécifiques
  if (
    /\bremix\b/i.test(cleanTitle) ||
    /\bflip\b/i.test(cleanTitle) ||
    /\bedit\b/i.test(cleanTitle)
  ) {
    result.genres.push('Remix');
  }

  if (/\blive\b/i.test(cleanTitle) || /\bset\b/i.test(cleanTitle) || /\@/.test(cleanTitle)) {
    result.genres.push('Live');
  }

  if (/\bmix\b/i.test(cleanTitle) || /\bsession\b/i.test(cleanTitle)) {
    result.genres.push('DJ Set');
  }

  return result;
}

// Fonction pour créer le blob recadré depuis le canvas (restaurée à l'ancienne logique)
async function getCroppedBlob(
  image: HTMLImageElement,
  crop: CropType,
  fileName: string,
  imageFileSource: File | null
): Promise<{ croppedBlob: Blob | null; originalFileToSend: File | null }> {
  const originalFileToSend = imageFileSource;
  // Récupérer les dimensions de l'image
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  let cropX, cropY, cropWidth, cropHeight;
  if (crop.unit === '%') {
    cropX = (imageWidth * crop.x) / 100;
    cropY = (imageHeight * crop.y) / 100;
    cropWidth = (imageWidth * crop.width) / 100;
    cropHeight = (imageHeight * crop.height) / 100;
  } else {
    cropX = crop.x;
    cropY = crop.y;
    cropWidth = crop.width;
    cropHeight = crop.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No 2d context');
  }
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          resolve({ croppedBlob: null, originalFileToSend });
          return;
        }
        resolve({ croppedBlob: blob, originalFileToSend });
      },
      'image/jpeg',
      0.9
    );
  });
}

// Fonction pour charger une image et gérer les erreurs d'extension
const loadImageWithFallback = (
  baseSrcWithoutExt: string,
  extensions: string[],
  onLoad: (src: string, img: HTMLImageElement) => void,
  onError: (err: string | Event) => void
) => {
  let currentExtIndex = 0;

  const tryLoadNext = () => {
    if (currentExtIndex >= extensions.length) {
      onError("Impossible de charger l'image originale avec les extensions essayées.");
      return;
    }

    const ext = extensions[currentExtIndex];
    const src = `${baseSrcWithoutExt}.${ext}`;
    const img = new window.Image();

    img.onload = () => {
      console.log(`Image chargée avec succès : ${src}`);
      onLoad(src, img);
    };
    img.onerror = (err) => {
      console.warn(`Échec chargement ${src}, essai extension suivante...`);
      currentExtIndex++;
      tryLoadNext();
    };

    console.log(`Essai chargement: ${src}`);
    img.src = src;
  };

  tryLoadNext();
};

export default function AdminMusicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<
    Omit<Track, 'id'> & { id?: string; imageId?: string }
  >(
    emptyTrackForm // Assigner emptyTrackForm qui a maintenant imageId: undefined
  );
  const [genreInput, setGenreInput] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | undefined>('');
  const [activeTab, setActiveTab] = useState<AdminMusicTab>('tracks');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

  // États pour la gestion de l'upload d'image
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageToUploadId, setImageToUploadId] = useState<string | null>(null);

  const [youtubeUsername, setYoutubeUsername] = useState('');
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Nouvelles options pour la recherche YouTube
  const [hideImported, setHideImported] = useState(false);
  const [maxResults, setMaxResults] = useState(25);
  const [youtubeSearchTerm, setYoutubeSearchTerm] = useState('');
  const [filteredYoutubeVideos, setFilteredYoutubeVideos] = useState<YouTubeVideo[]>([]);

  // État pour la modale de vérification avant import
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [currentVideoForImport, setCurrentVideoForImport] = useState<YouTubeVideo | null>(null);
  const [verifyFormData, setVerifyFormData] = useState<Omit<Track, 'id'> & { id?: string }>(
    emptyTrackForm
  );
  const [verifyIndex, setVerifyIndex] = useState(0);

  // --- AJOUT DES NOUVEAUX STATES ---
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);

  // Vérifier l'authentification
  useEffect(() => {
    // Ne rien faire si on est en train de charger l'état d'authentification
    if (status === 'loading') return;

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
  };

  // Handler pour soumettre le formulaire
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageId = currentForm.imageId;
      // Log AVANT la condition d'upload
      console.log('[FRONT] handleSubmit', { croppedImageBlob, imageToUploadId, originalImageFile });
      // Si on a un crop en mémoire, on upload maintenant
      if (croppedImageBlob && imageToUploadId) {
        console.log('[FRONT] Tentative upload image', {
          imageToUploadId,
          croppedImageBlob,
          originalImageFile,
        });
        const formData = new FormData();
        formData.append('imageId', imageToUploadId);
        formData.append('croppedImage', croppedImageBlob, 'cover.jpg');
        if (originalImageFile)
          formData.append('originalImage', originalImageFile, originalImageFile.name);
        for (let [key, value] of formData.entries()) {
          console.log(`[FRONT] FormData: ${key}`, value);
        }
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Échec de l'upload de l'image.");
        }
        const data = await response.json();
        imageId = data.imageId;
      }
      // Préparer les données à envoyer à l'API
      const platformsArray = Object.entries(currentForm.platforms || {})
        .filter(([_, value]) => value && value.url)
        .map(([platform, data]) => ({
          platform: platform as MusicPlatform,
          url: data!.url,
          embedId: data!.embedId,
        }));
      if (platformsArray.length === 0) {
        toast.error('Veuillez ajouter au moins une plateforme musicale (Spotify, YouTube, etc.).');
        setIsSubmitting(false);
        return;
      }
      const apiData = {
        ...currentForm,
        imageId,
        genreNames: currentForm.genre,
        platforms: platformsArray,
      };
      const apiUrl = isEditing ? `/api/music/${currentForm.id}` : '/api/music';
      const response = await fetch(apiUrl, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const detailedMessage = errorData.details
          ? Object.entries(errorData.details)
              .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
              .join('; ')
          : errorData.error;
        throw new Error(detailedMessage || `HTTP error! status: ${response.status}`);
      }
      const resultData = await response.json();
      toast.success(
        `Morceau "${resultData.title}" ${isEditing ? 'mis à jour' : 'ajouté'} avec succès!`
      );
      fetchTracks();
      resetForm();
    } catch (error) {
      console.error('Error saving track:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Erreur sauvegarde: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler pour modifier un morceau
  const handleEdit = (track: Track) => {
    // S'assurer que les plateformes sont bien formatées pour le formulaire
    const platformsForForm = Object.entries(track.platforms || {}).reduce(
      (acc, [key, value]) => {
        // Vérifier si value et value.url existent
        if (value?.url) {
          acc[key as MusicPlatform] = { url: value.url, embedId: value.embedId };
        }
        return acc;
      },
      {} as Track['platforms']
    );

    // !! CORRECTION : Formater la date pour l'input type="date" !!
    const formattedDate = track.releaseDate
      ? new Date(track.releaseDate).toISOString().split('T')[0]
      : ''; // Fournir une chaîne vide si la date est nulle/undefined

    setCurrentForm({
      ...track,
      releaseDate: formattedDate,
      genre: track.genre || [],
      platforms: platformsForForm,
    });
    setIsEditing(true);
    // L'aperçu sera mis à jour par le useEffect [currentForm.imageId]
    if (track.imageId) {
      setCoverPreview(`/uploads/${track.imageId}.jpg`);
    } else {
      setCoverPreview('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler pour supprimer un morceau
  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce morceau ?')) {
      try {
        const response = await fetch(`/api/music/${id}`, {
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

  // Mettre à jour le statut "featured"
  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      // Préparer uniquement les données à mettre à jour
      const apiData = {
        id: id,
        featured: !currentStatus,
      };
      console.log('Updating featured status:', apiData);
      // Correction ici : PUT sur /api/music/{id}
      const response = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error data:', errorData);
        throw new Error(errorData.error || 'Failed to update track');
      }
      // Mettre à jour l'état local après succès de l'API
      setTracks(tracks.map((t) => (t.id === id ? { ...t, featured: !currentStatus } : t)));
      toast.success('Statut mis à jour avec succès');
    } catch (error) {
      console.error('Error updating featured status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Erreur lors de la mise à jour du statut: ${errorMessage}`);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCurrentForm(emptyTrackForm);
    setCoverPreview('');
    setGenreInput('');
    setIsEditing(false);
    setCroppedImageBlob(null);
    setOriginalImageFile(null);
    setUploadedImage(null);
    setImageToUploadId(null);
  };

  // Gérer l'upload d'image
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image.');
        return;
      }
      // En modif, on réutilise l'imageId existant, sinon on en génère un nouveau
      if (isEditing && currentForm.imageId) {
        setImageToUploadId(currentForm.imageId);
      } else {
        setImageToUploadId(uuidv4());
      }
      setCurrentForm((prev) => ({ ...prev, imageId: undefined })); // reset l'id du form tant que pas upload
      setImageFile(file);
      // Lire le fichier pour l'afficher dans la modale de crop
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setUploadedImage(reader.result as string);
        setShowCropModal(true);
        setIsImageLoaded(false);
      });
      reader.readAsDataURL(file);
    }
  };

  // Réinitialiser le champ input file pour permettre la re-sélection du même fichier
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Gérer le recadrage d'une image existante (avec fallback extension)
  const handleReCrop = () => {
    // Si une image originale est en mémoire (pas encore uploadée)
    if (originalImageFile || uploadedImage) {
      let fileOrDataUrl = uploadedImage;
      if (!fileOrDataUrl && originalImageFile) {
        fileOrDataUrl = URL.createObjectURL(originalImageFile);
      }
      if (fileOrDataUrl) {
        setUploadedImage(fileOrDataUrl);
        setShowCropModal(true);
        setIsImageLoaded(false);
        return;
      }
    }
    // Sinon, si une image existe déjà sur le serveur
    const imageId = currentForm.imageId;
    if (imageId) {
      const baseOriginalSrc = `/uploads/${imageId}-ori`;
      const possibleExtensions = ['jpg', 'png', 'jpeg', 'webp', 'gif'];
      setIsImageLoaded(false);
      setShowCropModal(true);
      setUploadedImage(null);
      setImageFile(null);
      setImageToUploadId(imageId);
      loadImageWithFallback(
        baseOriginalSrc,
        possibleExtensions,
        (loadedSrc, loadedImg) => {
          setUploadedImage(loadedSrc);
        },
        (error) => {
          toast.error("Impossible de charger l'image originale pour le recadrage.");
          setShowCropModal(false);
          setIsImageLoaded(false);
        }
      );
      return;
    }
    // Sinon, aucune image à recadrer
    toast.error('Aucune image existante à recadrer.');
  };

  // Fonction pour précharger l'image ET initialiser le recadrage
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // !! CORRECTION : Utiliser naturalWidth et naturalHeight !!
    const { naturalWidth, naturalHeight } = e.currentTarget;

    // Vérifier que les dimensions sont valides
    if (naturalWidth > 0 && naturalHeight > 0) {
      console.log(`Image chargée dans la modale: ${naturalWidth}x${naturalHeight}`);
      // Centrer le crop avec un aspect ratio 1:1 en utilisant les dimensions naturelles
      setCrop(centerAspectCrop(naturalWidth, naturalHeight, 1));
      setIsImageLoaded(true); // Marquer l'image comme chargée et prête pour le crop
    } else {
      console.error("L'image chargée dans la modale n'a pas de dimensions valides.");
      toast.error("Erreur lors du chargement de l'aperçu pour le recadrage.");
      // Fermer la modale si l'image ne peut être chargée correctement
      cancelCrop();
    }
  };

  // Fonction pour dessiner l'image recadrée et appliquer l'image
  const completeCrop = async () => {
    if (!imageRef.current || !crop || !crop.width || !crop.height) {
      toast.error('Sélection de recadrage invalide.');
      return;
    }
    const imageElement = imageRef.current;
    try {
      const { croppedBlob, originalFileToSend } = await getCroppedBlob(
        imageElement,
        crop,
        'cover.jpg',
        imageFile
      );
      if (!croppedBlob) throw new Error("Impossible de générer l'image recadrée.");
      setCroppedImageBlob(croppedBlob);
      setOriginalImageFile(originalFileToSend);
      setCoverPreview(URL.createObjectURL(croppedBlob));
      setCurrentForm((prev) => ({ ...prev, imageId: undefined })); // pas d'ID tant que pas d'upload
      setShowCropModal(false);
      setCrop(undefined);
      resetFileInput();
    } catch (error) {
      toast.error(
        `Erreur lors du recadrage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
      console.error(error);
    }
  };

  // Annuler le crop
  const cancelCrop = () => {
    setShowCropModal(false);
    setUploadedImage(null);
    setCrop(undefined);
    setImageFile(null);
    setImageToUploadId(null);
    resetFileInput();
  };

  // Fonction pour récupérer les vidéos YouTube d'un channel
  const fetchYouTubeVideos = async () => {
    if (!youtubeUsername.trim()) return;

    setIsLoadingVideos(true);
    setYoutubeError(null);
    setYoutubeVideos([]);

    try {
      // Construire l'URL avec le paramètre pour les résultats maximum
      const apiUrl = `/api/youtube?q=${encodeURIComponent(youtubeUsername)}&maxResults=${maxResults}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (response.ok) {
        setYoutubeVideos(data.videos || []);
      } else {
        setYoutubeError(`Erreur: ${data.error || 'Impossible de récupérer les vidéos'}`);
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      setYoutubeError("Une erreur s'est produite lors de la récupération des vidéos");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Effet pour filtrer les vidéos YouTube
  useEffect(() => {
    if (youtubeVideos.length === 0) {
      setFilteredYoutubeVideos([]);
      return;
    }

    let filtered = [...youtubeVideos];

    // Filtrer par terme de recherche
    if (youtubeSearchTerm.trim() !== '') {
      const searchLower = youtubeSearchTerm.toLowerCase();
      filtered = filtered.filter((video) => video.title.toLowerCase().includes(searchLower));
    }

    // Masquer les vidéos déjà importées si l'option est activée
    if (hideImported) {
      filtered = filtered.filter((video) => !video.exists);
    }

    setFilteredYoutubeVideos(filtered);
  }, [youtubeVideos, youtubeSearchTerm, hideImported]);

  // Fonction pour ouvrir la modale de vérification avant import
  const handleVerifyBeforeImport = () => {
    if (selectedVideos.length === 0) {
      toast.error('Veuillez sélectionner au moins une vidéo');
      return;
    }

    // Préparer le premier élément à vérifier
    startVerificationProcess();
  };

  // Commencer le processus de vérification
  const startVerificationProcess = () => {
    setVerifyIndex(0);
    processNextVideo();
  };

  // Traiter la vidéo suivante dans la file d'attente
  const processNextVideo = () => {
    if (verifyIndex >= selectedVideos.length) {
      // Tous les éléments ont été traités
      setShowVerifyModal(false);

      // Rafraîchir les listes après la fin du traitement
      fetchTracks();
      if (youtubeUsername) {
        fetchYouTubeVideos();
      }

      setSelectedVideos([]);
      toast.success('Importation terminée');
      return;
    }

    const videoId = selectedVideos[verifyIndex];
    const video = youtubeVideos.find((v) => v.id === videoId);

    if (!video) {
      // Vidéo non trouvée, passer à la suivante
      setVerifyIndex((prev) => prev + 1);
      processNextVideo();
      return;
    }

    // Extraire des informations supplémentaires du titre
    const { bpm, genres } = extractInfoFromTitle(video.title);

    // Préparer les données pour la modale de vérification
    setCurrentVideoForImport(video);
    setVerifyFormData({
      title: video.title,
      artist: 'DJ Larian',
      releaseDate: video.publishedAt,
      bpm: bpm,
      genre: genres,
      type: genres.includes('Live')
        ? 'live'
        : genres.includes('Remix')
          ? 'remix'
          : genres.includes('DJ Set')
            ? 'djset'
            : 'video',
      description: '',
      featured: false,
      platforms: {
        youtube: {
          url: `https://www.youtube.com/watch?v=${video.id}`,
          embedId: video.id,
        },
      },
    });

    setShowVerifyModal(true);
  };

  // Confirmer l'importation de la vidéo actuelle
  const confirmVideoImport = async () => {
    if (!currentVideoForImport) return;

    setIsSubmitting(true);

    try {
      // Envoyer à l'API
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...verifyFormData,
          genreNames: verifyFormData.genre,
          platforms: [
            {
              platform: 'youtube',
              url: `https://www.youtube.com/watch?v=${currentVideoForImport.id}`,
              embedId: currentVideoForImport.id,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'ajout: ${response.statusText}`);
      }

      // Passer à la vidéo suivante
      setVerifyIndex((prev) => prev + 1);
      setIsSubmitting(false);
      processNextVideo();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error("Erreur lors de l'ajout de la vidéo");
      setIsSubmitting(false);
    }
  };

  // Sauter la vidéo actuelle
  const skipCurrentVideo = () => {
    setVerifyIndex((prev) => prev + 1);
    processNextVideo();
  };

  // Fonction pour ajouter les vidéos sélectionnées à la base
  const addSelectedVideosToDatabase = async () => {
    handleVerifyBeforeImport();
  };

  // Toggle pour sélectionner/désélectionner une vidéo
  const toggleVideoSelection = (videoId: string) => {
    if (selectedVideos.includes(videoId)) {
      setSelectedVideos(selectedVideos.filter((id) => id !== videoId));
    } else {
      setSelectedVideos([...selectedVideos, videoId]);
    }
  };

  // Filtrage des tracks pour la recherche
  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        track.artist.toLowerCase().includes(lowerCaseSearchTerm) ||
        track.genre?.some((g) => g.toLowerCase().includes(lowerCaseSearchTerm))
    );
    setFilteredTracks(filtered);
  }, [searchTerm, tracks]);

  // Mettre à jour l'aperçu quand imageId change dans le formulaire
  useEffect(() => {
    if (currentForm.imageId) {
      // Ajouter un timestamp pour forcer le rechargement et éviter le cache
      setCoverPreview(`/uploads/${currentForm.imageId}.jpg?t=${new Date().getTime()}`);
    } else {
      // Laisser l'aperçu tel quel si imageId est retiré (pour gérer les coverUrl externes)
    }
  }, [currentForm.imageId]);

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
    <div className="min-h-screen pt-8 pb-16 px-4">
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
          <button
            className={`px-4 py-2 font-medium text-sm focus:outline-none ${
              activeTab === 'youtube'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('youtube')}
          >
            Atelier YouTube
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
                  <div className="grid grid-cols-2 gap-4">
                    {/* Titre */}
                    <div className="col-span-2">
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
                    <div className="col-span-1">
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
                    <div className="col-span-1">
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
                  </div>

                  {/* Genres */}
                  <div className="mt-4">
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddGenre();
                          }
                        }}
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

                  {/* BPM et Featured */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* BPM */}
                    <div className="col-span-1">
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

                    {/* Featured */}
                    <div className="col-span-1">
                      <label className="block text-gray-300 font-medium mb-2">Mise en avant</label>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentForm({ ...currentForm, featured: !currentForm.featured })
                        }
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                          currentForm.featured
                            ? 'bg-yellow-600/80 hover:bg-yellow-500/80 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                        title={
                          currentForm.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'
                        }
                      >
                        <Star className="w-5 h-5" />
                        <span>{currentForm.featured ? 'Oui' : 'Non'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cover URL */}
                  <div className="mt-4">
                    <label className="block text-gray-300 font-medium mb-2">
                      Image de couverture
                    </label>
                    {coverPreview ? (
                      <div className="relative">
                        <div className="w-full pb-[100%] relative overflow-hidden rounded-lg">
                          <img
                            src={coverPreview}
                            alt="Cover preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={handleReCrop}
                              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full"
                            >
                              <Crop className="w-5 h-5 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverPreview('');
                                setCurrentForm({
                                  ...currentForm,
                                });
                              }}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded-full"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                        <p className="text-gray-300">
                          Glissez-déposez une image ici, ou cliquez pour sélectionner
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPG, GIF ou WEBP - Max 5MB
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>

                  {/* Description */}
                  <div className="mt-4">
                    <label htmlFor="description" className="block text-gray-300 font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={currentForm.description || ''}
                      onChange={(e) =>
                        setCurrentForm({ ...currentForm, description: e.target.value })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                      placeholder="Description du morceau..."
                    />
                  </div>

                  {/* Plateformes */}
                  <div className="mt-4">
                    <h3 className="text-white font-medium mb-3">Plateformes</h3>
                    <div className="grid grid-cols-1 gap-3 bg-gray-700/30 p-3 rounded-lg border border-gray-600/50">
                      {(Object.keys(platformLabels) as MusicPlatform[]).map((platform) => (
                        <div key={platform} className="flex items-center gap-2">
                          <div className="w-8 flex-shrink-0 flex justify-center">
                            {platformIcons[platform]}
                          </div>
                          <input
                            type="url"
                            value={currentForm.platforms[platform]?.url || ''}
                            onChange={(e) => handlePlatformChange(platform, e.target.value)}
                            className="flex-1 bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder={`URL ${platformLabels[platform]}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-3 mt-6">
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
                      <div // Remplacer Link par div
                        key={track.id}
                        onClick={() =>
                          router.push(`/admin/music/${track.id}/detail`, { scroll: false })
                        } // Utiliser router.push pour la navigation
                        className="block bg-gray-800/40 hover:bg-gray-800/60 rounded-lg border border-gray-700/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Image */}
                          <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                            {track.imageId ? (
                              <img
                                src={`/uploads/${track.imageId}.jpg?t=${track.updatedAt ? new Date(track.updatedAt).getTime() : Date.now()}`}
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
                                {MUSIC_TYPES.find((t) => t.value === track.type)?.label ||
                                  track.type}
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
                                      onClick={(e) => e.stopPropagation()} // Garder stopPropagation ici
                                    >
                                      {platformIcons[platform as MusicPlatform]}
                                    </a>
                                  )
                              )}
                            </div>
                          </div>

                          {/* Actions - Supprimer le bouton Info */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Ajouter stopPropagation ici aussi
                                toggleFeatured(track.id, track.featured || false);
                              }}
                              className={`p-2 rounded-lg transition-colors ${track.featured ? 'bg-yellow-600/80 hover:bg-yellow-500/80 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                              title={
                                track.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'
                              }
                            >
                              <Star className="w-5 h-5" />
                            </button>
                            {/* Bouton Info supprimé */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Ajouter stopPropagation
                                handleEdit(track);
                              }}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Ajouter stopPropagation
                                handleDelete(track.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div> // Fermer le div
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Gestion des collections à venir...</p>
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                <Youtube className="w-5 h-5" />
                Atelier d'ajout intelligent YouTube
              </h2>

              <p className="text-gray-300 mb-6">
                Retrouvez vos vidéos YouTube et importez-les directement dans votre base de données
                musicale. Le système détectera automatiquement les vidéos déjà présentes dans votre
                bibliothèque.
              </p>

              {/* Formulaire de recherche */}
              <div className="flex items-end gap-4 mb-8">
                <div className="flex-1">
                  <label htmlFor="youtubeUsername" className="block text-gray-300 font-medium mb-2">
                    Nom d'utilisateur / Channel YouTube
                  </label>
                  <input
                    type="text"
                    id="youtubeUsername"
                    value={youtubeUsername}
                    onChange={(e) => setYoutubeUsername(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: https://www.youtube.com/@DJLarian"
                  />
                </div>
                <button
                  onClick={fetchYouTubeVideos}
                  disabled={isLoadingVideos || !youtubeUsername}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingVideos ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Rechercher
                    </>
                  )}
                </button>
              </div>

              {/* Message d'erreur */}
              {youtubeError && (
                <div className="p-4 mb-6 bg-red-900/30 border border-red-700/50 rounded-lg text-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{youtubeError}</p>
                </div>
              )}

              {/* Options de filtrage */}
              {youtubeVideos.length > 0 && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtre de recherche */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Filtrer les résultats..."
                      value={youtubeSearchTerm}
                      onChange={(e) => setYoutubeSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  {/* Option pour masquer les vidéos déjà importées */}
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
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
                          className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform bg-white ${hideImported ? 'transform translate-x-5' : ''}`}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-300">
                        Masquer les vidéos déjà importées
                      </span>
                    </label>
                  </div>

                  {/* Sélecteur de nombre de résultats */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="maxResults" className="text-sm text-gray-300">
                      Afficher :
                    </label>
                    <select
                      id="maxResults"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value))}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value={10}>10 vidéos</option>
                      <option value={25}>25 vidéos</option>
                      <option value={50}>50 vidéos</option>
                      <option value={100}>100 vidéos</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Liste des vidéos */}
              {youtubeVideos.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium">
                      {filteredYoutubeVideos.length} vidéos trouvées
                    </h3>

                    <button
                      onClick={addSelectedVideosToDatabase}
                      disabled={isSubmitting || selectedVideos.length === 0}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Importation...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Importer la sélection ({selectedVideos.length})
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {filteredYoutubeVideos
                      .filter((_, index) => index < maxResults)
                      .map((video) => (
                        <div
                          key={video.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                            video.exists
                              ? 'bg-green-900/20 border-green-700/50 text-green-200'
                              : selectedVideos.includes(video.id)
                                ? 'bg-purple-900/30 border-purple-700/50'
                                : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60'
                          }`}
                        >
                          {/* Checkbox pour sélection */}
                          {!video.exists && (
                            <button
                              onClick={() => toggleVideoSelection(video.id)}
                              className={`p-2 rounded-md transition-colors ${
                                selectedVideos.includes(video.id)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {selectedVideos.includes(video.id) ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Image */}
                          <div className="w-20 h-16 flex-shrink-0 rounded-md overflow-hidden">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {video.title
                                .replace(/&#39;/g, "'")
                                .replace(/&quot;/g, '"')
                                .replace(/&amp;/g, '&')
                                .replace(/&apos;/g, "'")
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300">
                                {new Date(video.publishedAt).toLocaleDateString()}
                              </span>
                              {video.exists && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-700/50 text-green-200">
                                  Déjà importé
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lien vers la vidéo */}
                          <a
                            href={`https://youtube.com/watch?v=${video.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="Voir sur YouTube"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {/* Message explicatif */}
              {youtubeVideos.length === 0 && !isLoadingVideos && !youtubeError && (
                <div className="text-center py-8">
                  <Youtube className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">
                    Entrez votre nom d'utilisateur YouTube pour retrouver vos vidéos
                  </p>
                </div>
              )}
            </div>

            {/* Section d'aide et documentation */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Comment ça marche ?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li>Entrez votre nom d'utilisateur YouTube pour récupérer vos vidéos</li>
                <li>
                  Sélectionnez les vidéos que vous souhaitez importer dans votre base de données
                </li>
                <li>Vérifiez que les informations sont correctes</li>
                <li>
                  Cliquez sur "Importer la sélection" pour ajouter les vidéos à votre bibliothèque
                </li>
              </ol>
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-blue-200">
                <p className="text-sm">
                  <strong>Note:</strong> Les vidéos déjà présentes dans votre bibliothèque seront
                  automatiquement détectées et marquées comme "Déjà importé".
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Crop */}
        {showCropModal && uploadedImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Recadrer l'image (carré)</h3>
              </div>
              <div className="p-6 max-h-[70vh] overflow-auto flex justify-center items-center">
                {/* Image cachée pour déclencher onLoad */}
                <img
                  src={uploadedImage}
                  onLoad={handleImageLoad}
                  alt=""
                  style={{ display: 'none' }}
                />

                {/* Afficher ReactCrop seulement quand l'image est chargée et crop défini */}
                {isImageLoaded && crop ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => {
                      setCrop(percentCrop);
                    }}
                    aspect={1}
                    className="max-w-full max-h-[60vh]"
                  >
                    {/* Image visible à l'intérieur de ReactCrop */}
                    <img
                      ref={imageRef}
                      src={uploadedImage}
                      alt="Recadrage"
                      style={{ maxHeight: '60vh', objectFit: 'contain' }}
                    />
                  </ReactCrop>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    Chargement de l'image...
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={completeCrop}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  disabled={!isImageLoaded || !crop?.width || !crop?.height}
                >
                  Appliquer le recadrage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de vérification avant import */}
        {showVerifyModal && currentVideoForImport && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    Vérifier avant import ({verifyIndex + 1}/{selectedVideos.length})
                  </h2>
                  <button
                    onClick={() => setShowVerifyModal(false)}
                    className="p-2 text-gray-400 hover:text-white rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Aperçu de la vidéo */}
                  <div className="md:col-span-1">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                      <img
                        src={currentVideoForImport.thumbnail}
                        alt={currentVideoForImport.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      Video originale:{' '}
                      <a
                        href={`https://www.youtube.com/watch?v=${currentVideoForImport.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline flex items-center gap-1"
                      >
                        Voir sur YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Formulaire de vérification */}
                  <div className="md:col-span-2">
                    <div className="space-y-4">
                      {/* Titre */}
                      <div>
                        <label
                          htmlFor="verify-title"
                          className="block text-gray-300 font-medium mb-1"
                        >
                          Titre <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="verify-title"
                          value={verifyFormData.title}
                          onChange={(e) =>
                            setVerifyFormData({ ...verifyFormData, title: e.target.value })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>

                      {/* Type et Date */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Type */}
                        <div>
                          <label
                            htmlFor="verify-type"
                            className="block text-gray-300 font-medium mb-1"
                          >
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="verify-type"
                            value={verifyFormData.type}
                            onChange={(e) =>
                              setVerifyFormData({
                                ...verifyFormData,
                                type: e.target.value as MusicType,
                              })
                            }
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {MUSIC_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Date */}
                        <div>
                          <label
                            htmlFor="verify-date"
                            className="block text-gray-300 font-medium mb-1"
                          >
                            Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            id="verify-date"
                            value={verifyFormData.releaseDate}
                            onChange={(e) =>
                              setVerifyFormData({ ...verifyFormData, releaseDate: e.target.value })
                            }
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      {/* Genres */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-1">Genres</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <input
                            type="text"
                            value={genreInput}
                            onChange={(e) => setGenreInput(e.target.value)}
                            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Ajouter un genre"
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
                          {verifyFormData.genre.map((genre) => (
                            <span
                              key={genre}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-600/30 text-purple-200"
                            >
                              {genre}
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyFormData({
                                    ...verifyFormData,
                                    genre: verifyFormData.genre.filter((g) => g !== genre),
                                  });
                                }}
                                className="ml-2 text-purple-300 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* BPM */}
                      <div>
                        <label
                          htmlFor="verify-bpm"
                          className="block text-gray-300 font-medium mb-1"
                        >
                          BPM
                        </label>
                        <input
                          type="number"
                          id="verify-bpm"
                          value={verifyFormData.bpm || ''}
                          onChange={(e) =>
                            setVerifyFormData({
                              ...verifyFormData,
                              bpm: parseInt(e.target.value) || undefined,
                            })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Ex: 128"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          htmlFor="verify-description"
                          className="block text-gray-300 font-medium mb-1"
                        >
                          Description
                        </label>
                        <textarea
                          id="verify-description"
                          value={verifyFormData.description || ''}
                          onChange={(e) =>
                            setVerifyFormData({ ...verifyFormData, description: e.target.value })
                          }
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-20"
                          placeholder="Description (optionnelle)"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={skipCurrentVideo}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                          disabled={isSubmitting}
                        >
                          Ignorer
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowVerifyModal(false)}
                            className="px-4 py-2 bg-red-800/60 hover:bg-red-700/60 text-white rounded-lg"
                            disabled={isSubmitting}
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={confirmVideoImport}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Import...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Confirmer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
