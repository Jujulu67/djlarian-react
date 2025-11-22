'use client';
import { MusicPlatform, MusicType } from '@/lib/utils/types';

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
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';

import 'react-image-crop/dist/ReactCrop.css';
import { PublicationStatusSelector } from '@/components/admin/PublicationStatusSelector';
import { Button } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import ImageCropModal from '@/components/ui/ImageCropModal';
import ImageDropzone from '@/components/ui/ImageDropzone';
import { logger } from '@/lib/logger';
import { generateImageId } from '@/lib/utils/generateImageId';
import { getImageUrl, getOriginalImageUrl } from '@/lib/utils/getImageUrl';
import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import { extractPlatformId } from '@/lib/utils/music-service';
import type { Track } from '@/lib/utils/types';

import AutoDetectAtelier from './components/AutoDetectAtelier';
import { TrackList } from './components/TrackList';
import YoutubeAtelier from './components/YoutubeAtelier';
import { platformLabels, platformIcons, type AdminMusicTab } from './constants';
import { useImageUpload } from './hooks/useImageUpload';
import { useSuccessNotification } from './hooks/useSuccessNotification';
import { useTrackForm } from './hooks/useTrackForm';
import { useTracks } from './hooks/useTracks';
import { getTrackStatus } from './utils/getTrackStatus';

/* Helper crop centré */
function centerAspectCropFn(w: number, h: number, a: number): CropType {
  return centerCrop(makeAspectCrop({ unit: '%', width: 100 }, a, w, h), w, h);
}

export default function AdminMusicPage() {
  const router = useRouter();

  // Hooks
  const tracks = useTracks();
  const trackForm = useTrackForm();
  const imageUpload = useImageUpload();
  const success = useSuccessNotification();

  // États locaux
  const [activeTab, setActiveTab] = useState<AdminMusicTab>('tracks');
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Gestion de l'édition depuis l'URL
  useEffect(() => {
    const editId = tracks.getEditIdFromUrl();
    if (editId && tracks.tracks.some((t) => t.id === editId)) {
      const trackToEdit = tracks.tracks.find((t) => t.id === editId);
      if (trackToEdit) {
        tracks.setHighlightedTrackId(editId);
        handleEdit(trackToEdit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.tracks.length]);

  // Handlers
  const handleAddGenre = () => {
    const currentGenre = trackForm.currentForm.genre || [];
    if (trackForm.genreInput.trim() && !currentGenre.includes(trackForm.genreInput.trim())) {
      trackForm.setCurrentForm({
        ...trackForm.currentForm,
        genre: [...currentGenre, trackForm.genreInput.trim()],
      });
      trackForm.setGenreInput('');
    }
  };

  const handleRemoveGenre = (g: string) => {
    const currentGenre = trackForm.currentForm.genre || [];
    trackForm.setCurrentForm({
      ...trackForm.currentForm,
      genre: currentGenre.filter((x) => x !== g),
    });
  };

  const handlePlatformChange = (p: MusicPlatform, url: string) => {
    const embedId = extractPlatformId(url, p);
    trackForm.setCurrentForm({
      ...trackForm.currentForm,
      platforms: {
        ...trackForm.currentForm.platforms,
        [p]: url ? { url, embedId } : undefined,
      },
    });
  };

  /* ------------------ IMAGE upload / crop util --------------------------- */
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    imageUpload.originalImageFileRef.current = file;
    imageUpload.setOriginalImageFile(file);
    imageUpload.setImageToUploadId(generateImageId());
    imageUpload.setUploadedImage(URL.createObjectURL(file));
    imageUpload.setShowCropModal(true);
  };

  const handleReCrop = async () => {
    if (imageUpload.originalImageFile) {
      imageUpload.originalImageFileRef.current = imageUpload.originalImageFile;
      const url = URL.createObjectURL(imageUpload.originalImageFile);
      imageUpload.setUploadedImage(url);
      imageUpload.setImageToUploadId(generateImageId());
      imageUpload.setShowCropModal(true);
      return;
    }
    if (imageUpload.cachedOriginalFile) {
      imageUpload.originalImageFileRef.current = imageUpload.cachedOriginalFile;
      imageUpload.setOriginalImageFile(imageUpload.cachedOriginalFile);
      const localUrl = URL.createObjectURL(imageUpload.cachedOriginalFile);
      imageUpload.setUploadedImage(localUrl);
      imageUpload.setImageToUploadId(generateImageId());
      imageUpload.setShowCropModal(true);
      return;
    }
    if (trackForm.currentForm.imageId) {
      // Ne pas essayer de charger l'image originale si c'est une URL externe
      const { imageId } = trackForm.currentForm;
      if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
        return; // URL externe, pas d'image originale locale
      }
      try {
        const originalUrl = getOriginalImageUrl(imageId);
        if (originalUrl) {
          const res = await fetch(originalUrl);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], 'original.jpg', { type: blob.type });
            imageUpload.originalImageFileRef.current = file;
            imageUpload.setOriginalImageFile(file);
            imageUpload.setCachedOriginalFile(file);
            const localUrl = URL.createObjectURL(file);
            imageUpload.setUploadedImage(localUrl);
            imageUpload.setImageToUploadId(generateImageId());
            imageUpload.setShowCropModal(true);
          }
        }
      } catch {}
    }
  };

  const resetFileInput = () =>
    imageUpload.fileInputRef.current && (imageUpload.fileInputRef.current.value = '');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight)
      imageUpload.setCrop(centerAspectCropFn(naturalWidth, naturalHeight, 1));
  };

  const handleCropValidated = (file: File, preview: string) => {
    imageUpload.setCroppedImageBlob(file);
    trackForm.setCoverPreview(preview);
    imageUpload.setShowCropModal(false);
    resetFileInput();
  };

  const cancelCrop = () => {
    imageUpload.setShowCropModal(false);
    imageUpload.setUploadedImage(null);
    imageUpload.setCrop(undefined);
    resetFileInput();
    if (!imageUpload.croppedImageBlob && !trackForm.coverPreview) {
      imageUpload.setOriginalImageFile(null);
      trackForm.setCoverPreview('');
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file) return;
    imageUpload.originalImageFileRef.current = file;
    imageUpload.setOriginalImageFile(file);
    imageUpload.setImageToUploadId(generateImageId());
    imageUpload.setUploadedImage(URL.createObjectURL(file));
    imageUpload.setShowCropModal(true);
  };

  /* ------------------------- CRUD Track ---------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    trackForm.setIsSubmitting(true);
    try {
      let { imageId } = trackForm.currentForm;
      const fileToSend =
        imageUpload.originalImageFile ||
        imageUpload.originalImageFileRef.current ||
        imageUpload.cachedOriginalFile;
      if (imageUpload.croppedImageBlob) {
        if (!imageUpload.imageToUploadId || !fileToSend) throw new Error('Image manquante');
        const fd = new FormData();
        fd.append('imageId', imageUpload.imageToUploadId);
        fd.append('croppedImage', imageUpload.croppedImageBlob, 'cover.jpg');
        fd.append('originalImage', fileToSend, fileToSend.name);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error('Upload image échoué');
        const { imageId: newId } = await upRes.json();
        imageId = newId;
      }

      const platforms = trackForm.currentForm.platforms || {};
      const platformsArray = Object.entries(platforms)
        .filter(([, v]) => v?.url)
        .map(([p, v]) => ({ platform: p as MusicPlatform, url: v!.url, embedId: v!.embedId }));

      if (!platformsArray.length) throw new Error('Au moins une plateforme est requise');

      // Nettoyer le body pour exclure les champs non valides pour Prisma
      const {
        id: _id, // Garder id séparément si nécessaire
        user: _user,
        collection: _collection,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        genre: _genre, // Exclure genre car on utilise genreNames
        platforms: _platforms, // Exclure platforms car on utilise platformsArray
        ...cleanFormData
      } = trackForm.currentForm;

      // Extraire collectionId depuis collection si présent
      const collectionId = trackForm.currentForm.collection?.id || undefined;

      const body = {
        ...cleanFormData,
        imageId,
        genreNames: trackForm.currentForm.genre || [],
        platforms: platformsArray,
        publishAt: trackForm.currentForm.publishAt
          ? new Date(trackForm.currentForm.publishAt).toISOString()
          : undefined,
        // Inclure collectionId si présent
        ...(collectionId !== undefined && { collectionId }),
      };
      const url = trackForm.isEditing ? `/api/music/${trackForm.currentForm.id}` : '/api/music';
      const res = await fetch(url, {
        method: trackForm.isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Lire la réponse une seule fois
      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Erreur API');
      }

      logger.debug('[Admin Music] Réponse API complète:', responseData);

      // L'API retourne { data: { id: ..., ... }, message: '...' }
      // L'ID est dans responseData.data.id
      const trackId = responseData.data?.id || trackForm.currentForm.id;

      logger.debug('[Admin Music] Track créée/modifiée, ID:', trackId, 'depuis:', {
        'responseData.data?.id': responseData.data?.id,
        'trackForm.currentForm.id': trackForm.currentForm.id,
        'responseData structure': Object.keys(responseData),
      });

      if (typeof window !== 'undefined' && window.location.search.includes('edit=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('edit');
        router.replace(url.pathname + url.search, { scroll: false });
      }

      // Réinitialiser le formulaire avant de fetch pour éviter les conflits
      resetForm();

      // Définir le succès AVANT de fetch pour que l'effet puisse détecter quand la track apparaît
      if (trackId) {
        success.setSuccess(trackId);
        logger.debug('[Admin Music] Success défini pour trackId:', trackId);
      }

      // Fetch les tracks et attendre qu'elles soient chargées
      await tracks.fetchTracks();
      logger.debug('[Admin Music] Tracks fetchées');

      // Le scroll sera géré par le useEffect qui surveille successTrackId et tracks.tracks
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur';
      logger.error('Erreur:', errorMessage);
      toast.error(errorMessage);
    } finally {
      trackForm.setIsSubmitting(false);
    }
  };

  const handleEdit = (t: Track) => {
    trackForm.handleEdit(t, {
      setUploadedImage: imageUpload.setUploadedImage,
      setImageToUploadId: imageUpload.setImageToUploadId,
      setHighlightedTrackId: tracks.setHighlightedTrackId,
    });
  };

  const resetForm = () => {
    trackForm.resetForm({
      setCroppedImageBlob: imageUpload.setCroppedImageBlob,
      setUploadedImage: imageUpload.setUploadedImage,
      setImageToUploadId: imageUpload.setImageToUploadId,
      setHighlightedTrackId: tracks.setHighlightedTrackId,
    });
  };

  // Fonction utilitaire pour fetch l'originale avec plusieurs extensions
  // Charge directement l'image comme dans handleReCrop (qui fonctionne)
  const tryFetchOriginal = async (imageId: string) => {
    // Utiliser la route API qui gère blob/local automatiquement
    const url = getImageUrl(imageId, { original: true });
    if (url) {
      try {
        // Charger directement l'image via la route API
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          // Déterminer l'extension depuis le Content-Type
          const contentType = res.headers.get('content-type') || 'image/webp';
          const ext = contentType.includes('png')
            ? 'png'
            : contentType.includes('jpeg') || contentType.includes('jpg')
              ? 'jpg'
              : 'webp';
          return new File([blob], `original.${ext}`, { type: blob.type });
        }
        // Si 404, continuer avec la prochaine extension sans erreur
      } catch (err) {
        // ignore - l'image n'existe probablement pas avec ce suffixe
        // Ne pas logger l'erreur pour éviter le bruit dans la console
      }
    }
    return null;
  };

  // Gestion du cache image originale synchronisée sur imageId
  // Ne charger l'image originale que si on est en mode édition (où elle est nécessaire)
  useEffect(() => {
    imageUpload.setOriginalImageFile(null);
    imageUpload.setCachedOriginalFile(null);
    imageUpload.setCroppedImageBlob(null);
    // Ne charger l'image originale que si on est en mode édition
    if (trackForm.isEditing && trackForm.currentForm.imageId) {
      (async () => {
        const file = await tryFetchOriginal(trackForm.currentForm.imageId as string);
        if (file) {
          imageUpload.setOriginalImageFile(file);
          imageUpload.setCachedOriginalFile(file);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackForm.currentForm.imageId, trackForm.isEditing]);

  const successTrackInList =
    success.successTrackId && tracks.filteredTracks.some((t) => t.id === success.successTrackId);

  // Scroller vers le haut quand une track en succès apparaît et est dans la liste
  useEffect(() => {
    if (!success.successTrackId) return;

    // Vérifier que la track est dans tracks.tracks (pas filteredTracks car il peut y avoir un délai)
    const checkAndScroll = () => {
      const trackExists = tracks.tracks.some((t) => t.id === success.successTrackId);
      if (trackExists && typeof window !== 'undefined') {
        // Vérifier que la track est bien rendue dans le DOM avant de scroller
        const trackElement = document.querySelector(`[data-track-id="${success.successTrackId}"]`);
        if (trackElement) {
          logger.debug('[Admin Music] Track trouvée et rendue, scroll vers le haut');
          // Petit délai pour s'assurer que l'animation est visible
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
          return true;
        } else {
          logger.debug(
            '[Admin Music] Track trouvée dans la liste mais pas encore rendue dans le DOM'
          );
        }
      }
      return false;
    };

    // Essayer après un court délai pour laisser le temps au DOM de se mettre à jour
    const timer1 = setTimeout(() => {
      if (!checkAndScroll()) {
        // Essayer encore après un délai plus long
        setTimeout(() => {
          if (!checkAndScroll()) {
            // Dernière tentative après un délai encore plus long
            setTimeout(() => {
              checkAndScroll();
            }, 300);
          }
        }, 200);
      }
    }, 150);

    return () => clearTimeout(timer1);
    // Utiliser successTrackId et la longueur de tracks.tracks comme dépendances stables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success.successTrackId, tracks.tracks.length]);

  if (tracks.isLoading)
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );

  const editingTrack = tracks.highlightedTrackId
    ? tracks.filteredTracks.find((tr) => tr.id === tracks.highlightedTrackId)
    : null;

  return (
    <div className="min-h-screen pt-8 pb-16 px-4">
      {/* Affichage du bandeau/toast global si succès mais track non visible */}
      {success.successTrackId && !successTrackInList && (
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
              Le morceau «{' '}
              {tracks.filteredTracks.find((t) => t.id === success.successTrackId)?.title || '...'} »
              a bien été {trackForm.isEditing ? 'modifié' : 'ajouté'}.
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">Gestion de la musique</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-8">
          {(['tracks', 'collections', 'youtube', 'auto-detect'] as AdminMusicTab[]).map((tab) => (
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
                  : tab === 'youtube'
                    ? 'Atelier YouTube'
                    : 'Auto-détection'}
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
                  {trackForm.isEditing ? (
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
                      value={trackForm.currentForm.title}
                      onChange={(e) =>
                        trackForm.setCurrentForm({
                          ...trackForm.currentForm,
                          title: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* artiste */}
                  <div className="mb-4">
                    <label className="block text-gray-300 font-medium mb-2">
                      Artiste(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={trackForm.currentForm.artist}
                      onChange={(e) =>
                        trackForm.setCurrentForm({
                          ...trackForm.currentForm,
                          artist: e.target.value,
                        })
                      }
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
                        value={trackForm.currentForm.type}
                        onChange={(e) =>
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            type: e.target.value as MusicType,
                          })
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
                      <DateTimeField
                        type="date"
                        value={trackForm.currentForm.releaseDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            releaseDate: e.target.value,
                          })
                        }
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* genres */}
                  <div className="mt-4">
                    <label className="block text-gray-300 font-medium mb-2">Genres</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={trackForm.genreInput}
                        onChange={(e) => trackForm.setGenreInput(e.target.value)}
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
                      {(trackForm.currentForm.genre || []).map((g) => (
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

                  {/* BPM + Clé musicale + featured */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">BPM</label>
                      <input
                        type="number"
                        value={trackForm.currentForm.bpm || ''}
                        onChange={(e) =>
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            bpm: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                        placeholder="128"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Clé musicale</label>
                      <input
                        type="text"
                        value={trackForm.currentForm.musicalKey || ''}
                        onChange={(e) =>
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            musicalKey: e.target.value || undefined,
                          })
                        }
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500"
                        placeholder="Ex : C# min"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Mise en avant</label>
                      <button
                        type="button"
                        onClick={() =>
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            featured: !trackForm.currentForm.featured,
                          })
                        }
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg ${
                          trackForm.currentForm.featured ? 'bg-yellow-600/80' : 'bg-gray-700'
                        }`}
                      >
                        <Star className="w-5 h-5" />{' '}
                        {trackForm.currentForm.featured ? 'Oui' : 'Non'}
                      </button>
                    </div>
                  </div>

                  {/* image */}
                  <div className="mt-4">
                    <ImageDropzone
                      label="Pochette (carrée)"
                      imageUrl={trackForm.coverPreview}
                      onDrop={handleImageUpload}
                      onRecrop={handleReCrop}
                      onRemove={() => {
                        imageUpload.setOriginalImageFile(null);
                        imageUpload.setCroppedImageBlob(null);
                        trackForm.setCoverPreview('');
                        trackForm.setCurrentForm({
                          ...trackForm.currentForm,
                          imageId: null,
                        });
                        imageUpload.setCachedOriginalFile(null);
                      }}
                      onFileSelected={handleFileSelected}
                      canRecrop={
                        !!imageUpload.originalImageFile ||
                        !!imageUpload.cachedOriginalFile ||
                        !!trackForm.currentForm.imageId
                      }
                    />
                  </div>

                  {/* description */}
                  <div className="mt-4">
                    <label className="block text-gray-300 font-medium mb-2">Description</label>
                    <textarea
                      value={trackForm.currentForm.description || ''}
                      onChange={(e) =>
                        trackForm.setCurrentForm({
                          ...trackForm.currentForm,
                          description: e.target.value,
                        })
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
                            value={trackForm.currentForm.platforms[p]?.url || ''}
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
                      isPublished={trackForm.currentForm.isPublished}
                      publishAt={trackForm.currentForm.publishAt}
                      onChange={(status: 'published' | 'draft' | 'scheduled', date?: string) => {
                        if (status === 'published') {
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            isPublished: true,
                            publishAt: undefined,
                          });
                        } else if (status === 'draft') {
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            isPublished: false,
                            publishAt: undefined,
                          });
                        } else if (status === 'scheduled' && date) {
                          trackForm.setCurrentForm({
                            ...trackForm.currentForm,
                            isPublished: false,
                            publishAt: date,
                          });
                        }
                      }}
                    />
                  </div>

                  {/* boutons */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      type="submit"
                      className="flex-1 flex items-center gap-2"
                      disabled={trackForm.isSubmitting}
                    >
                      {trackForm.isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {trackForm.isEditing ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                    {trackForm.isEditing && (
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
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Music className="w-4 h-4 sm:w-5 sm:h-5" /> Morceaux (
                    {tracks.filteredTracks.length})
                  </h2>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      placeholder="Rechercher…"
                      value={tracks.searchTerm}
                      onChange={(e) => tracks.setSearchTerm(e.target.value)}
                      className="w-full sm:w-auto pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                {/* Bloc flottant En édition */}
                {editingTrack && (
                  <div className="mb-6">
                    <div
                      className={`relative bg-gray-900/80 rounded-xl border-2 border-purple-500/80 p-4 flex items-center gap-4 shadow-lg ${
                        tracks.highlightedTrackId === editingTrack.id
                          ? 'animate-highlight-ring ring-4 ring-purple-500/80'
                          : ''
                      }`}
                    >
                      <div className="absolute top-2 right-2 bg-purple-700/90 text-white text-xs px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                        En édition
                      </div>
                      <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        {editingTrack.imageId ? (
                          <Image
                            src={
                              getImageUrl(editingTrack.imageId, {
                                cacheBust: editingTrack.updatedAt
                                  ? new Date(editingTrack.updatedAt).getTime()
                                  : Date.now(),
                              }) || ''
                            }
                            alt={editingTrack.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            unoptimized
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
                          {Object.entries(editingTrack.platforms || {}).map(
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
                            tracks.toggleFeatured(editingTrack.id, editingTrack.featured || false);
                          }}
                          className={`p-2 rounded-lg ${
                            editingTrack.featured
                              ? 'bg-yellow-600/80 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            tracks.setHighlightedTrackId(editingTrack.id);
                            handleEdit(editingTrack);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            tracks.deleteTrack(editingTrack.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          className={`p-2 rounded-lg hover:bg-purple-700/30 text-purple-400 hover:text-white transition-colors ${
                            tracks.refreshingCoverId === editingTrack.id
                              ? 'opacity-50 cursor-wait'
                              : ''
                          }`}
                          title="Rafraîchir la cover"
                          disabled={tracks.refreshingCoverId === editingTrack.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await tracks.refreshCover(editingTrack.id);
                          }}
                        >
                          {tracks.refreshingCoverId === editingTrack.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Track en succès affichée en haut avec effet visuel */}
                {success.successTrackId &&
                  (() => {
                    // Utiliser tracks.tracks directement au lieu de filteredTracks pour être sûr de trouver la track
                    // même si le filtre n'est pas encore appliqué
                    const successTrack = tracks.tracks.find((t) => t.id === success.successTrackId);
                    logger.debug('[Admin Music] Rendering success track:', {
                      successTrackId: success.successTrackId,
                      trackFound: !!successTrack,
                      trackTitle: successTrack?.title,
                      totalTracks: tracks.tracks.length,
                    });
                    return successTrack ? (
                      <div className="mb-4">
                        <TrackList
                          tracks={[successTrack]}
                          searchTerm={tracks.searchTerm}
                          refreshingCoverId={tracks.refreshingCoverId}
                          highlightedTrackId={null}
                          successTrackId={success.successTrackId}
                          onEdit={handleEdit}
                          onDelete={tracks.deleteTrack}
                          onToggleFeatured={tracks.toggleFeatured}
                          onRefreshCover={tracks.refreshCover}
                          onTogglePublish={tracks.togglePublish}
                        />
                      </div>
                    ) : (
                      <div className="mb-4 p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg text-yellow-300 text-sm">
                        ⚠️ Track en succès (ID: {success.successTrackId}) non trouvée dans la liste.
                        Total tracks: {tracks.tracks.length}
                        <div className="mt-2 text-xs">
                          IDs disponibles:{' '}
                          {tracks.tracks
                            .slice(0, 5)
                            .map((t) => t.id)
                            .join(', ')}
                          ...
                        </div>
                      </div>
                    );
                  })()}

                {/* Liste avec TrackList */}
                <TrackList
                  tracks={tracks.filteredTracks.filter(
                    (t) => t.id !== tracks.highlightedTrackId && t.id !== success.successTrackId
                  )}
                  searchTerm={tracks.searchTerm}
                  refreshingCoverId={tracks.refreshingCoverId}
                  highlightedTrackId={tracks.highlightedTrackId}
                  onEdit={handleEdit}
                  onDelete={tracks.deleteTrack}
                  onToggleFeatured={tracks.toggleFeatured}
                  onRefreshCover={tracks.refreshCover}
                  onTogglePublish={tracks.togglePublish}
                />
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------- TAB COLLECTIONS ------------------------- */}
        {activeTab === 'collections' && (
          <div className="text-center py-12 text-gray-400">Gestion des collections à venir…</div>
        )}

        {/* --------------------------------- TAB YOUTUBE ----------------------------- */}
        {activeTab === 'youtube' && <YoutubeAtelier fetchTracks={tracks.fetchTracks} />}

        {/* --------------------------------- TAB AUTO-DETECT ------------------------- */}
        {activeTab === 'auto-detect' && <AutoDetectAtelier fetchTracks={tracks.fetchTracks} />}

        {/* ------------------ Modal crop ------------------------------------------- */}
        {imageUpload.showCropModal && imageUpload.uploadedImage && (
          <ImageCropModal
            imageToEdit={imageUpload.uploadedImage}
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
