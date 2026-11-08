import { useState } from 'react';

import type { ImageMeta } from '@/app/api/admin/images/shared';
import { logger } from '@/lib/logger';

import type { GroupedImage } from '../types';

interface FusionModalState {
  family: { signature: string; groups: GroupedImage[] };
}

const extractBaseId = (id: string) => id.replace(/\.[a-zA-Z0-9]+$/, '');

function getGroupImageId(group: GroupedImage): string | undefined {
  return group.crop?.id || group.ori?.id;
}

function getMasterBaseImageId(masterGroup: GroupedImage): string | undefined {
  if (masterGroup.crop) return extractBaseId(masterGroup.crop.id);
  if (masterGroup.ori) return extractBaseId(masterGroup.ori.id);
  return undefined;
}

/** Ids à conserver : ceux de la carte maître et ceux des groupes ignorés. */
function getProtectedIds(
  masterGroup: GroupedImage,
  groups: GroupedImage[],
  ignoredSet: Set<string>
) {
  const ignoredGroups = groups.filter((g) => {
    const id = getGroupImageId(g);
    return id && ignoredSet.has(id);
  });
  return new Set([
    ...(masterGroup.crop ? [masterGroup.crop.id] : []),
    ...(masterGroup.ori ? [masterGroup.ori.id] : []),
    ...ignoredGroups.flatMap((g) => [g.crop?.id, g.ori?.id].filter(Boolean)),
  ]);
}

/** Met à jour les entités liées (hors ids protégés) pour pointer vers l'image maître. */
async function patchLinkedEntities(
  groups: GroupedImage[],
  protectedIds: Set<string | undefined>,
  masterGroup: GroupedImage
) {
  for (const group of groups) {
    const imageId = getGroupImageId(group);
    if (!imageId || protectedIds.has(imageId) || !group.linkedTo) continue;

    const newImageId = getMasterBaseImageId(masterGroup);
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

      // 2. Déterminer les images ignorées et les images protégées
      const ignoredSet = new Set(ignoredIds);
      const protectedIds = getProtectedIds(masterGroup, fusionModal.family.groups, ignoredSet);

      // 3. Déterminer les images à supprimer (tous les ids crop et ori sauf maître et ignorés)
      const toDelete = fusionModal.family.groups
        .flatMap((g) => [g.crop?.id, g.ori?.id])
        .filter((id): id is string => !!id && !protectedIds.has(id));

      // 4. Mettre à jour les entités liées (hors ignorées)
      await patchLinkedEntities(fusionModal.family.groups, protectedIds, masterGroup);

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
