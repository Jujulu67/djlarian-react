'use client';

import ReactDOM from 'react-dom';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import type { GroupedImage } from '../types';
import type { ImageMeta } from '@/app/api/admin/images/shared';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';

interface MultiSelectBarProps {
  isMultiSelectMode: boolean;
  selectedImageIds: string[];
  paginatedGroups: GroupedImage[];
  setSelectedImageIds: (ids: string[]) => void;
  setDeleteTarget: (img: ImageMeta | null) => void;
}

export function MultiSelectBar({
  isMultiSelectMode,
  selectedImageIds,
  paginatedGroups,
  setSelectedImageIds,
  setDeleteTarget,
}: MultiSelectBarProps) {
  if (typeof window === 'undefined') return null;

  const allImageIds = paginatedGroups
    .map((g) => g.crop?.id || g.ori?.id)
    .filter((id): id is string => !!id);

  const isAllSelected = selectedImageIds.length === allImageIds.length && isNotEmpty(allImageIds);

  return ReactDOM.createPortal(
    <div
      className={`
        fixed bottom-4 left-1/2 transform -translate-x-1/2
        z-[9999] max-w-2xl w-[calc(100vw-2rem)] px-0
        transition-all duration-300
        ${isMultiSelectMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
      `}
      role="dialog"
      aria-label="Barre de sélection multiple"
    >
      <div
        className="
          bg-gray-900/90
          backdrop-blur-lg
          border border-purple-500/40
          ring-2 ring-purple-400/20
          rounded-2xl
          px-8 py-5
          flex items-center gap-4
          shadow-3xl
          transition-all duration-300
          hover:-translate-y-1
        "
      >
        <div className="flex items-center flex-grow">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedImageIds(allImageIds);
              } else {
                setSelectedImageIds([]);
              }
            }}
            label="Tout sélectionner"
            labelClassName="text-gray-200 text-sm"
            aria-label="Tout sélectionner"
          />

          <div className="ml-auto bg-gray-800/70 px-4 py-1.5 rounded-lg text-gray-100 text-sm font-medium">
            {selectedImageIds.length} sélectionné(s)
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          disabled={selectedImageIds.length === 0}
          onClick={() =>
            setDeleteTarget({
              id: 'multi',
              name: `${selectedImageIds.length} images`,
              url: '',
              size: 0,
              date: '',
              type: '',
              linkedTo: null,
              isDuplicate: false,
            })
          }
          aria-label="Supprimer la sélection"
          className="whitespace-nowrap"
        >
          Supprimer la sélection
        </Button>
      </div>
    </div>,
    document.body
  );
}

