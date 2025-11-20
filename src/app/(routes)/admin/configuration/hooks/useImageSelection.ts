import { useState } from 'react';

export function useImageSelection() {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode((prev) => !prev);
    setSelectedImageIds([]);
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId);
      }
      return [...prev, imageId];
    });
  };

  const selectAll = (allImageIds: string[]) => {
    setSelectedImageIds(allImageIds);
  };

  const clearSelection = () => {
    setSelectedImageIds([]);
  };

  return {
    isMultiSelectMode,
    selectedImageIds,
    setIsMultiSelectMode,
    setSelectedImageIds,
    toggleMultiSelectMode,
    toggleImageSelection,
    selectAll,
    clearSelection,
  };
}
