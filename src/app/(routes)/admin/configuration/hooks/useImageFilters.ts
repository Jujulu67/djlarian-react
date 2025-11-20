import { useState, useEffect, useMemo } from 'react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filteredImages, setFilteredImages] = useState<ImageMeta[]>([]);
  const [showDuplicatesState, setShowDuplicatesState] = useState(initialShowDuplicates);

  // Filtrer les images en fonction du terme de recherche et du type sélectionné
  useEffect(() => {
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

    setFilteredImages(result);
  }, [images, searchTerm, filter, showDuplicatesState]);

  // Filtrage des groupes selon showDuplicates
  const filteredGroups = useMemo(() => {
    let result = groupedImages;
    if (showDuplicatesState) {
      result = result.filter(
        (group) => (group.crop && group.crop.isDuplicate) || (group.ori && group.ori.isDuplicate)
      );
    }
    return result;
  }, [groupedImages, showDuplicatesState]);

  // Pagination + cache trié
  const paginatedGroups = useMemo(() => {
    const sorted = getSortedGroups(filteredGroups, sortOption, showDuplicatesState);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sorted.slice(start, end);
  }, [filteredGroups, sortOption, showDuplicatesState, currentPage, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(getSortedGroups(filteredGroups, sortOption, showDuplicatesState).length / itemsPerPage),
    [filteredGroups, sortOption, showDuplicatesState, itemsPerPage]
  );

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
    setCurrentPage(1);
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
    setCurrentPage,
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

