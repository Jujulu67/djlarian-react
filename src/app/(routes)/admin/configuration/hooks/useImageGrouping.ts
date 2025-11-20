import { useState, useCallback } from 'react';

import type { ImageMeta } from '@/app/api/admin/images/shared';
import type { Track } from '@/lib/utils/types';

import type { GroupedImage, LinkedTo } from '../types';
import { extractImageId } from '../utils/extractImageId';

export function useImageGrouping() {
  const [groupedImages, setGroupedImages] = useState<GroupedImage[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);

  const groupAndLinkImages = useCallback(async (images: ImageMeta[]) => {
    setIsGrouping(true);

    // 1. Récupérer tracks et events
    const [tracksRes, eventsRes] = await Promise.all([fetch('/api/music'), fetch('/api/events')]);
    const tracksResult = await tracksRes.json();
    const eventsData = await eventsRes.json();
    // La réponse API utilise createSuccessResponse qui retourne { data: [...] }
    const tracks: Track[] = tracksResult.data || [];
    const events: Array<{ id: string; title: string; imageId?: string | null }> = Array.isArray(
      eventsData.events
    )
      ? eventsData.events
      : eventsData;

    // 2. Regrouper les images crop/ori
    const groups: Record<string, GroupedImage> = {};
    images.forEach((img) => {
      const baseId = extractImageId(img.name);
      const isOri = /-ori\.[a-zA-Z0-9]+$/.test(img.name);
      if (!groups[baseId]) {
        groups[baseId] = { imageId: baseId, crop: null, ori: null, linkedTo: null };
      }
      if (isOri) {
        groups[baseId].ori = img;
      } else {
        groups[baseId].crop = img;
      }
    });

    // 3. Mapping des liaisons
    Object.values(groups).forEach((group) => {
      // Chercher dans tracks
      const track = tracks.find((t) => t.imageId === group.imageId);
      if (track) {
        group.linkedTo = { type: 'track', id: track.id, title: track.title };
        return;
      }
      // Chercher dans events
      const event = events.find((e) => e.imageId === group.imageId);
      if (event) {
        group.linkedTo = { type: 'event', id: event.id, title: event.title };
      }
    });

    // 4. Détection des doublons d'originale (même taille d'ori)
    const groupList = Object.values(groups);
    const oriMap: Record<string, GroupedImage[]> = {};
    groupList.forEach((group) => {
      if (!group.ori) return;
      const oriSig = `${group.ori.size}`;
      if (!oriMap[oriSig]) oriMap[oriSig] = [];
      oriMap[oriSig].push(group);
    });
    const duplicateOriSignatures = Object.entries(oriMap)
      .filter(([_, groups]) => groups.length > 1)
      .map(([signature]) => signature);
    groupList.forEach((group) => {
      if (!group.ori) return;
      const oriSig = `${group.ori.size}`;
      const isDuplicate = duplicateOriSignatures.includes(oriSig);
      if (group.ori) group.ori.isDuplicate = isDuplicate;
      if (group.crop) group.crop.isDuplicate = isDuplicate;
    });

    setGroupedImages(groupList);
    setIsGrouping(false);

    return groupList;
  }, []);

  const syncImagesWithGroups = useCallback((images: ImageMeta[], groups: GroupedImage[]) => {
    return images.map((img) => {
      const found = groups.find(
        (g) => (g.crop && g.crop.id === img.id) || (g.ori && g.ori.id === img.id)
      );
      if (!found) return img;
      const isDuplicate =
        (found.crop && found.crop.id === img.id && found.crop.isDuplicate) ||
        (found.ori && found.ori.id === img.id && found.ori.isDuplicate) ||
        false;
      return { ...img, isDuplicate };
    });
  }, []);

  return {
    groupedImages,
    isGrouping,
    setGroupedImages,
    groupAndLinkImages,
    syncImagesWithGroups,
  };
}
