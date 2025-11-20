import type { GroupedImage } from '../types';

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-asc'
  | 'size-desc'
  | 'type'
  | 'linked';

export function getSortedGroups(
  groups: GroupedImage[],
  sortOption: SortOption,
  showDuplicates: boolean
): GroupedImage[] {
  const sorted = [...groups];
  
  if (showDuplicates) {
    // Tri par signature d'originale (taille), puis par nom
    sorted.sort((a, b) => {
      const aSig = a.ori?.size || 0;
      const bSig = b.ori?.size || 0;
      if (aSig !== bSig) return bSig - aSig; // du plus gros au plus petit
      return (a.crop?.name || a.ori?.name || '').localeCompare(b.crop?.name || b.ori?.name || '');
    });
    return sorted;
  }
  
  // Tri normal sinon
  switch (sortOption) {
    case 'date-desc':
      sorted.sort((a, b) => {
        const dA = a.crop?.date || a.ori?.date || '';
        const dB = b.crop?.date || b.ori?.date || '';
        return new Date(dB).getTime() - new Date(dA).getTime();
      });
      break;
    case 'date-asc':
      sorted.sort((a, b) => {
        const dA = a.crop?.date || a.ori?.date || '';
        const dB = b.crop?.date || b.ori?.date || '';
        return new Date(dA).getTime() - new Date(dB).getTime();
      });
      break;
    case 'name-asc':
      sorted.sort((a, b) =>
        (a.crop?.name || a.ori?.name || '').localeCompare(b.crop?.name || b.ori?.name || '')
      );
      break;
    case 'name-desc':
      sorted.sort((a, b) =>
        (b.crop?.name || b.ori?.name || '').localeCompare(a.crop?.name || a.ori?.name || '')
      );
      break;
    case 'size-asc':
      sorted.sort(
        (a, b) => (a.crop?.size || a.ori?.size || 0) - (b.crop?.size || b.ori?.size || 0)
      );
      break;
    case 'size-desc':
      sorted.sort(
        (a, b) => (b.crop?.size || b.ori?.size || 0) - (a.crop?.size || a.ori?.size || 0)
      );
      break;
    case 'type':
      sorted.sort((a, b) =>
        (a.crop?.type || a.ori?.type || '').localeCompare(b.crop?.type || b.ori?.type || '')
      );
      break;
    case 'linked':
      sorted.sort((a, b) => {
        if (a.linkedTo && !b.linkedTo) return -1;
        if (!a.linkedTo && b.linkedTo) return 1;
        return 0;
      });
      break;
  }
  return sorted;
}

