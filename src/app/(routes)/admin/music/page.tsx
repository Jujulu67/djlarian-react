'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import 'react-image-crop/dist/ReactCrop.css';

import ImageCropModal from '@/components/ui/ImageCropModal';
import { logger } from '@/lib/logger';
import { generateImageId } from '@/lib/utils/generateImageId';
import { getOriginalImageUrl } from '@/lib/utils/getImageUrl';
import type { MusicPlatform, Track } from '@/lib/utils/types';

import AutoDetectAtelier from './components/AutoDetectAtelier';
import { TrackFormPanel } from './components/TrackFormPanel';
import { TrackListPanel } from './components/TrackListPanel';
import type { AdminMusicTab } from './constants';
import { useImageUpload } from './hooks/useImageUpload';
import { useOriginalImageCache } from './hooks/useOriginalImageCache';
import { useScrollToSuccessTrack } from './hooks/useScrollToSuccessTrack';
import { useSuccessNotification } from './hooks/useSuccessNotification';
import { useTrackForm } from './hooks/useTrackForm';
import { useTracks } from './hooks/useTracks';
import { centerAspectCrop } from './utils/centerAspectCrop';
import { addGenreToList, removeGenreFromList } from './utils/genreList';
import { updatePlatformUrl } from './utils/platformUpdate';
import { buildPlatformsArray, buildTrackRequestBody } from './utils/trackPayload';

export default function AdminMusicPage() {
  const router = useRouter();

  // Hooks
  const tracks = useTracks();
  const trackForm = useTrackForm();
  const imageUpload = useImageUpload();
  const success = useSuccessNotification();

  // États locaux
  const [activeTab, setActiveTab] = useState<AdminMusicTab>('tracks');

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
    const nextGenres = addGenreToList(trackForm.currentForm.genre || [], trackForm.genreInput);
    if (nextGenres) {
      trackForm.setCurrentForm({
        ...trackForm.currentForm,
        genre: nextGenres,
      });
      trackForm.setGenreInput('');
    }
  };

  const handleRemoveGenre = (g: string) => {
    trackForm.setCurrentForm({
      ...trackForm.currentForm,
      genre: removeGenreFromList(trackForm.currentForm.genre || [], g),
    });
  };

  const handlePlatformChange = (p: MusicPlatform, url: string) => {
    trackForm.setCurrentForm({
      ...trackForm.currentForm,
      platforms: updatePlatformUrl(trackForm.currentForm.platforms, p, url),
    });
  };

  /* ------------------ IMAGE upload / crop util --------------------------- */
  // Démarre le recadrage d'un fichier image choisi par l'utilisateur
  const startImageCrop = (file: File) => {
    imageUpload.originalImageFileRef.current = file;
    imageUpload.setOriginalImageFile(file);
    imageUpload.setImageToUploadId(generateImageId());
    imageUpload.setUploadedImage(URL.createObjectURL(file));
    imageUpload.setShowCropModal(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startImageCrop(file);
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
      imageUpload.setCrop(centerAspectCrop(naturalWidth, naturalHeight, 1));
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
    startImageCrop(file);
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

      const platformsArray = buildPlatformsArray(trackForm.currentForm.platforms);

      if (!platformsArray.length) throw new Error('Au moins une plateforme est requise');

      const body = buildTrackRequestBody(trackForm.currentForm, imageId, platformsArray);

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

  useOriginalImageCache(imageUpload, trackForm);

  const successTrackInList =
    success.successTrackId && tracks.filteredTracks.some((t) => t.id === success.successTrackId);

  useScrollToSuccessTrack(success.successTrackId, tracks.tracks);

  if (tracks.isLoading)
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 flex justify-center items-center">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );

  const editingTrack = tracks.highlightedTrackId
    ? tracks.filteredTracks.find((tr) => tr.id === tracks.highlightedTrackId)
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-8 pb-16 px-4">
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
          {(['tracks', 'collections', 'auto-detect'] as AdminMusicTab[]).map((tab) => (
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
                  : 'Auto-détection'}
            </button>
          ))}
        </div>

        {/* --------------------------------- TAB TRACKS -------------------------------- */}
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* -------- Formulaire -------- */}
            <TrackFormPanel
              trackForm={trackForm}
              imageUpload={imageUpload}
              handleSubmit={handleSubmit}
              handleAddGenre={handleAddGenre}
              handleRemoveGenre={handleRemoveGenre}
              handlePlatformChange={handlePlatformChange}
              handleImageUpload={handleImageUpload}
              handleReCrop={handleReCrop}
              handleFileSelected={handleFileSelected}
              resetForm={resetForm}
            />
            <TrackListPanel
              tracks={tracks}
              successTrackId={success.successTrackId}
              editingTrack={editingTrack}
              handleEdit={handleEdit}
            />
          </div>
        )}

        {/* --------------------------------- TAB COLLECTIONS ------------------------- */}
        {activeTab === 'collections' && (
          <div className="text-center py-12 text-gray-400">Gestion des collections à venir…</div>
        )}

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
