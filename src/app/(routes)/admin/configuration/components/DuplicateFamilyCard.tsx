'use client';

import { AlertTriangle } from 'lucide-react';

import type { ImageMeta } from '@/app/api/admin/images/shared';
import { Button } from '@/components/ui/Button';

import type { GroupedImage } from '../types';

import { ImageCard } from './ImageCard';

interface DuplicateFamilyCardProps {
  family: { signature: string; groups: GroupedImage[] };
  isMultiSelectMode: boolean;
  selectedImageIds: string[];
  onSelectImage: (imageId: string) => void;
  onDeselectImage: (imageId: string) => void;
  onViewImage: (group: GroupedImage) => void;
  onDownload: (image: ImageMeta) => void;
  onDelete: (image: ImageMeta) => void;
  onFusion: () => void;
}

export const DuplicateFamilyCard = ({
  family,
  isMultiSelectMode,
  selectedImageIds,
  onSelectImage,
  onDeselectImage,
  onViewImage,
  onDownload,
  onDelete,
  onFusion,
}: DuplicateFamilyCardProps) => {
  return (
    <div className="mb-8 p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50/10">
      <div className="mb-4 font-bold text-yellow-400 flex items-center gap-2 justify-between">
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Doublons potentiels (taille originale : {(Number(family.signature) / 1024).toFixed(1)} Ko)
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onFusion}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          Fusionner
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {family.groups.map((group) => {
          const image = group.crop || group.ori;
          if (!image) return null;
          const isSelected = selectedImageIds.includes(image.id);
          return (
            <ImageCard
              key={group.imageId}
              group={group}
              isSelected={isSelected}
              isMultiSelectMode={isMultiSelectMode}
              onSelect={() => onSelectImage(image.id)}
              onDeselect={() => onDeselectImage(image.id)}
              onView={() => onViewImage(group)}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
};
