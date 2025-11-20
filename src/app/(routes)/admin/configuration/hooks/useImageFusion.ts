import { useState } from 'react';
import type { GroupedImage } from '../types';
import type { ImageMeta } from '@/app/api/admin/images/shared';
import { logger } from '@/lib/logger';

interface FusionModalState {
  family: { signature: string; groups: GroupedImage[] };
}

export function useImageFusion() {
  const [fusionModal, setFusionModal] = useState<FusionModalState | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [isLoadingFusion, setIsLoadingFusion] = useState(false);

  const handleFusion = async (
    masterId: string,
    ignoredIds: string[],
    deleteImage: (id: string) => Promise<boolean | void>,
    fetchImages: () => Promise<ImageMeta[] | void>
  ) => {
    if (!fusionModal) return;

    setIsLoadingFusion(true);
    try {
      // 1. Déterminer la carte maître
      const masterGroup = fusionModal.family.groups.find(
        (g) => (g.crop?.id || g.ori?.id) === masterId
      );
      if (!masterGroup) throw new Error('Carte maître introuvable');

      // 2. Déterminer les images ignorées
      const ignoredSet = new Set(ignoredIds);

      // 3. Déterminer les images à supprimer (tous les ids crop et ori sauf maître et ignorés)
      const protectedIds = [
        ...(masterGroup.crop ? [masterGroup.crop.id] : []),
        ...(masterGroup.ori ? [masterGroup.ori.id] : []),
        ...fusionModal.family.groups
          .filter((g) => {
            const id = g.crop?.id || g.ori?.id;
            return id && ignoredSet.has(id);
          })
          .flatMap((g) => [g.crop?.id, g.ori?.id].filter(Boolean)),
      ];

      const toDelete = fusionModal.family.groups
        .flatMap((g) => [g.crop?.id, g.ori?.id])
        .filter((id): id is string => !!id && !protectedIds.includes(id));

      // 4. Mettre à jour les entités liées (hors ignorées)
      const extractBaseId = (id: string) => id.replace(/\.[a-zA-Z0-9]+$/, '');
      for (const group of fusionModal.family.groups) {
        const imageId = group.crop?.id || group.ori?.id;
        if (!imageId || protectedIds.includes(imageId)) continue;
        if (group.linkedTo) {
          const newImageId = masterGroup.crop
            ? extractBaseId(masterGroup.crop.id)
            : masterGroup.ori
              ? extractBaseId(masterGroup.ori.id)
              : undefined;
          logger.debug('[FUSION] PATCH entity', group.linkedTo, '-> imageId', newImageId);
          const endpoint =
            group.linkedTo.type === 'track'
              ? `/api/music/${group.linkedTo.id}`
              : `/api/events/${group.linkedTo.id}`;
          await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId: newImageId }),
          });
        }
      }

      // 5. Supprimer les images à supprimer
      for (const id of toDelete) {
        await deleteImage(id);
      }

      logger.debug('[FUSION] Fusion réussie');
      await fetchImages();
      return true;
    } catch (err) {
      logger.error('Erreur lors de la fusion:', err);
      throw err;
    } finally {
      setIsLoadingFusion(false);
    }
  };

  const openFusionModal = (family: { signature: string; groups: GroupedImage[] }) => {
    setFusionModal({ family });
    setSelectedMasterId(null);
    setIgnoredIds([]);
  };

  const closeFusionModal = () => {
    setFusionModal(null);
    setSelectedMasterId(null);
    setIgnoredIds([]);
  };

  return {
    fusionModal,
    selectedMasterId,
    setSelectedMasterId,
    ignoredIds,
    setIgnoredIds,
    isLoadingFusion,
    openFusionModal,
    closeFusionModal,
    handleFusion,
  };
}

