'use client';

import { RefreshCcw, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import type { ImageMeta } from '@/app/api/admin/images/shared';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { logger } from '@/lib/logger';

import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DuplicateFamilyCard } from './components/DuplicateFamilyCard';
import { FiltersBar } from './components/FiltersBar';
import { FusionModal } from './components/FusionModal';
import { ImageCard } from './components/ImageCard';
import { ImageDetailModal } from './components/ImageDetailModal';
import { MultiSelectBar } from './components/MultiSelectBar';
import { OriginalFullModal } from './components/OriginalFullModal';
import { useImageFilters } from './hooks/useImageFilters';
import { useImageFusion } from './hooks/useImageFusion';
import { useImageGrouping } from './hooks/useImageGrouping';
import { useImages } from './hooks/useImages';
import { useImageSelection } from './hooks/useImageSelection';
import type { GroupedImage } from './types';

// Composant de spinner simple
const ClipLoader = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <div
    className="animate-spin rounded-full border-t-2 border-b-2 border-purple-500"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderColor: color,
    }}
  ></div>
);

interface GestionImagesProps {
  showHeader?: boolean;
  showBackLink?: boolean;
  isFullPage?: boolean;
}

export default function GestionImages({
  showHeader = true,
  showBackLink = true,
  isFullPage = false,
}: GestionImagesProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageMeta | null>(null);
  const [showOriginalFull, setShowOriginalFull] = useState(false);

  // Hooks
  const {
    images,
    isLoading,
    isRefreshing,
    error,
    setImages,
    setError,
    fetchImages,
    handleRefresh,
    deleteImage: deleteImageFromHook,
  } = useImages();

  const { groupedImages, isGrouping, setGroupedImages, groupAndLinkImages, syncImagesWithGroups } =
    useImageGrouping();

  const {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedGroups,
    totalPages,
    doublonFamilies,
    showDuplicates,
    setShowDuplicates,
    resetFilters,
  } = useImageFilters(images, groupedImages, false);

  const {
    isMultiSelectMode,
    selectedImageIds,
    setIsMultiSelectMode,
    setSelectedImageIds,
    toggleImageSelection,
    clearSelection,
  } = useImageSelection();

  const {
    fusionModal,
    selectedMasterId,
    setSelectedMasterId,
    ignoredIds,
    setIgnoredIds,
    isLoadingFusion,
    openFusionModal,
    closeFusionModal,
    handleFusion,
  } = useImageFusion();

  // Charger les images au montage
  useEffect(() => {
    const loadImages = async () => {
      try {
        const fetchedImages = await fetchImages();
        const groups = await groupAndLinkImages(fetchedImages);
        const syncedImages = syncImagesWithGroups(fetchedImages, groups);
        setImages(syncedImages);
        setGroupedImages(groups);
      } catch (err) {
        logger.error('Erreur lors du chargement initial:', err);
      }
    };
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effet pour effacer automatiquement les notifications toast après 3 secondes
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Gestion de la suppression d'image
  const handleDeleteImage = useCallback(
    async (id: string) => {
      try {
        await deleteImageFromHook(id);
        setGroupedImages((prev) =>
          prev.filter((group) => group.crop?.id !== id && group.ori?.id !== id)
        );
        setToast('Image supprimée avec succès');
        // Rafraîchir les images après suppression
        const fetchedImages = await fetchImages();
        const groups = await groupAndLinkImages(fetchedImages);
        const syncedImages = syncImagesWithGroups(fetchedImages, groups);
        setImages(syncedImages);
        setGroupedImages(groups);
      } catch (err) {
        logger.error('Erreur lors de la suppression:', err);
        throw err;
      }
    },
    [
      deleteImageFromHook,
      setGroupedImages,
      fetchImages,
      groupAndLinkImages,
      syncImagesWithGroups,
      setImages,
    ]
  );

  // Gestion de la suppression multiple
  const handleMultiDelete = useCallback(async () => {
    if (!deleteTarget || deleteTarget.id !== 'multi') return;

    setError(null);
    let errorCount = 0;
    for (const id of selectedImageIds) {
      try {
        await handleDeleteImage(id);
      } catch {
        errorCount++;
      }
    }
    clearSelection();
    setIsMultiSelectMode(false);
    setDeleteTarget(null);
    setTimeout(() => {
      if (paginatedGroups.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }, 100);
    if (errorCount > 0) {
      setError(`${errorCount} image(s) n'ont pas pu être supprimées.`);
    } else {
      setToast('Images supprimées avec succès');
    }
  }, [
    deleteTarget,
    selectedImageIds,
    handleDeleteImage,
    clearSelection,
    setIsMultiSelectMode,
    paginatedGroups,
    currentPage,
    setCurrentPage,
    setError,
  ]);

  // Téléchargement de l'image
  const handleDownload = useCallback((image: ImageMeta) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Gestion de la fusion
  const handleFusionConfirm = useCallback(
    async (masterId: string, ignoredIds: string[]) => {
      try {
        await handleFusion(masterId, ignoredIds, deleteImageFromHook, fetchImages);
        setToast('Fusion réussie !');
        closeFusionModal();
        const fetchedImages = await fetchImages();
        const groups = await groupAndLinkImages(fetchedImages);
        const syncedImages = syncImagesWithGroups(fetchedImages, groups);
        setImages(syncedImages);
        setGroupedImages(groups);
      } catch (err) {
        logger.error('Erreur lors de la fusion:', err);
        throw err;
      }
    },
    [
      handleFusion,
      deleteImageFromHook,
      fetchImages,
      groupAndLinkImages,
      syncImagesWithGroups,
      setImages,
      setGroupedImages,
      closeFusionModal,
    ]
  );

  return (
    <div className="w-full">
      {showHeader && (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackLink && (
              <Link
                href="/admin/configuration"
                className="text-purple-400 hover:text-purple-300 flex items-center"
              >
                <ImageIcon className="w-6 h-6 mr-2" /> Retour config
              </Link>
            )}
            <h1 className="text-3xl font-audiowide text-white flex items-center gap-3">
              <ImageIcon className="w-8 h-8 text-purple-400" /> Gestion des images uploadées
            </h1>
          </div>
          <Button onClick={handleRefresh} className="gap-2" disabled={isRefreshing}>
            {isRefreshing ? (
              <ClipLoader size={16} color="#fff" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg border border-purple-500/30 animate-fade-in">
          {toast}
        </div>
      )}
      <MultiSelectBar
        isMultiSelectMode={isMultiSelectMode}
        selectedImageIds={selectedImageIds}
        paginatedGroups={paginatedGroups}
        setSelectedImageIds={setSelectedImageIds}
        setDeleteTarget={setDeleteTarget}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          {error}
        </div>
      )}
      <FiltersBar
        images={images}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filter={filter}
        setFilter={setFilter}
        sortOption={sortOption}
        setSortOption={setSortOption}
        showDuplicates={showDuplicates}
        setShowDuplicates={setShowDuplicates}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        setSelectedImageIds={setSelectedImageIds}
        onReset={resetFilters}
      />
      {isLoading || isGrouping ? (
        <div className="flex justify-center items-center h-64">
          <ClipLoader size={40} color="#9042f5" />
        </div>
      ) : showDuplicates ? (
        doublonFamilies.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucun doublon détecté.</div>
        ) : (
          <>
            {doublonFamilies.map((family) => (
              <DuplicateFamilyCard
                key={family.signature}
                family={family}
                isMultiSelectMode={isMultiSelectMode}
                selectedImageIds={selectedImageIds}
                onSelectImage={(imageId) => toggleImageSelection(imageId)}
                onDeselectImage={(imageId) => {
                  setSelectedImageIds((prev) => prev.filter((id) => id !== imageId));
                }}
                onViewImage={(group) => setSelectedGroup(group)}
                onDownload={handleDownload}
                onDelete={(image) => setDeleteTarget(image)}
                onFusion={() => openFusionModal(family)}
              />
            ))}
          </>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {paginatedGroups.map((group) => {
              const image = group.crop || group.ori;
              if (!image) return null;
              const isSelected = selectedImageIds.includes(image.id);
              return (
                <ImageCard
                  key={group.imageId}
                  group={group}
                  isSelected={isSelected}
                  isMultiSelectMode={isMultiSelectMode}
                  onSelect={() => toggleImageSelection(image.id)}
                  onDeselect={() => {
                    setSelectedImageIds((prev) => prev.filter((id) => id !== image.id));
                  }}
                  onView={() => setSelectedGroup(group)}
                  onDownload={handleDownload}
                  onDelete={(image) => setDeleteTarget(image)}
                />
              );
            })}
          </div>
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="justify-center"
            />
          </div>
        </>
      )}
      {selectedGroup && (
        <ImageDetailModal
          selectedGroup={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onDownload={handleDownload}
          onShowOriginalFull={() => setShowOriginalFull(true)}
        />
      )}
      {showOriginalFull && selectedGroup?.ori && (
        <OriginalFullModal image={selectedGroup.ori} onClose={() => setShowOriginalFull(false)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          deleteTarget={deleteTarget}
          selectedImageIds={selectedImageIds}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget.id === 'multi') {
              await handleMultiDelete();
            } else {
              await handleDeleteImage(deleteTarget.id);
              setDeleteTarget(null);
              setTimeout(() => {
                if (paginatedGroups.length === 1 && currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                }
              }, 100);
            }
          }}
        />
      )}
      {fusionModal && (
        <FusionModal
          family={fusionModal.family}
          selectedMasterId={selectedMasterId}
          setSelectedMasterId={setSelectedMasterId}
          ignoredIds={ignoredIds}
          setIgnoredIds={setIgnoredIds}
          isLoadingFusion={isLoadingFusion}
          onClose={closeFusionModal}
          onConfirm={handleFusionConfirm}
        />
      )}
    </div>
  );
}
