import { useMemo, useState } from 'react';

import type { ImageMeta } from '@/app/api/admin/images/shared';

import type { GroupedImage, SortOption } from '../types';
import { getSortedGroups } from '../utils/getSortedGroups';

export function useImageFilters(
  images: ImageMeta[],
  groupedImages: GroupedImage[],
  initialShowDuplicates: boolean = false
) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [requestedPage, setRequestedPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showDuplicatesState, setShowDuplicatesState] = useState(initialShowDuplicates);

  // Filtrer les images en fonction du terme de recherche et du type sélectionné
  const filteredImages = useMemo(() => {
    let result = images;

    // Filtrer par type
    if (filter && filter !== 'all') {
      result = result.filter((img) => img.type.toLowerCase() === filter.toLowerCase());
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((img) => img.name.toLowerCase().includes(term));
    }

    // Filtrer les doublons si demandé
    if (showDuplicatesState) {
      result = result.filter((img) => img.isDuplicate);
    }

    return result;
  }, [images, searchTerm, filter, showDuplicatesState]);

  // Filtrage des groupes selon showDuplicates
  const filteredGroups = useMemo(() => {
    let result = groupedImages;
    if (showDuplicatesState) {
      result = result.filter((group) => group.crop?.isDuplicate || group.ori?.isDuplicate);
    }
    return result;
  }, [groupedImages, showDuplicatesState]);

  // Pagination + cache trié
  const sortedGroups = useMemo(
    () => getSortedGroups(filteredGroups, sortOption, showDuplicatesState),
    [filteredGroups, sortOption, showDuplicatesState]
  );
  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
  // Après une suppression, ne pas rester sur une page qui n'existe plus
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : requestedPage;
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedGroups.slice(start, start + itemsPerPage);
  }, [sortedGroups, currentPage, itemsPerPage]);

  // Regroupement des familles de doublons (par taille d'ori)
  const doublonFamilies = useMemo(() => {
    if (!showDuplicatesState) return [];
    const map: Record<string, GroupedImage[]> = {};
    filteredGroups.forEach((group) => {
      const oriSig = group.ori?.size ? `${group.ori.size}` : 'noori';
      if (!map[oriSig]) map[oriSig] = [];
      map[oriSig].push(group);
    });
    // On ne garde que les familles avec au moins 2 groupes (vrais doublons)
    return Object.entries(map)
      .filter(([_, groups]) => groups.length > 1)
      .map(([signature, groups]) => ({ signature, groups }));
  }, [filteredGroups, showDuplicatesState]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setSortOption('date-desc');
    setRequestedPage(1);
    setItemsPerPage(25);
    setShowDuplicatesState(false);
  };

  return {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    currentPage,
    setCurrentPage: setRequestedPage,
    itemsPerPage,
    setItemsPerPage,
    filteredImages,
    filteredGroups,
    paginatedGroups,
    totalPages,
    doublonFamilies,
    showDuplicates: showDuplicatesState,
    setShowDuplicates: setShowDuplicatesState,
    resetFilters,
  };
}
