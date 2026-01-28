'use client';

import { Download, Trash2, Music, Calendar, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import type { ImageMeta } from '@/app/api/admin/images/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

import type { GroupedImage } from '../types';

interface ImageCardProps {
  group: GroupedImage;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onView: () => void;
  onDownload: (image: ImageMeta) => void;
  onDelete: (image: ImageMeta) => void;
}

export const ImageCard = ({
  group,
  isSelected,
  isMultiSelectMode,
  onSelect,
  onDeselect,
  onView,
  onDownload,
  onDelete,
}: ImageCardProps): React.JSX.Element | null => {
  const image = group.crop || group.ori;
  if (!image) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isMultiSelectMode) {
      if (isSelected) {
        onDeselect();
      } else {
        onSelect();
      }
      return;
    }
    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
    onView();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isMultiSelectMode) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (isSelected) {
          onDeselect();
        } else {
          onSelect();
        }
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      onView();
      e.preventDefault();
    }
  };

  return (
    <div
      role="button"
      className={`relative overflow-hidden flex flex-col rounded-xl shadow-lg transition-all duration-200 group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-br from-[rgba(30,30,40,0.8)] to-[rgba(20,20,25,0.9)] ${
        isMultiSelectMode && isSelected
          ? 'ring-2 ring-purple-500 border border-purple-500/40'
          : 'border border-gray-800'
      }`}
      onClick={handleClick}
      tabIndex={0}
      aria-label={`Voir le détail de l'image ${image.name}`}
      onKeyDown={handleKeyDown}
    >
      {isMultiSelectMode && (
        <div className="absolute top-3 left-3 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              if (!checked) {
                onDeselect();
              } else {
                onSelect();
              }
            }}
            className="bg-gray-900/80 border-gray-600"
            aria-label={`Sélectionner l'image ${image.name}`}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div className="relative h-44 bg-gray-800/60 flex items-center justify-center overflow-hidden">
        <Image
          src={image.url}
          alt={image.name}
          fill
          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
          unoptimized
        />
        {group.ori && group.crop && (
          <Badge
            variant="default"
            className="absolute top-2 right-2 gap-1"
            icon={<ImageIcon className="w-3 h-3" />}
          >
            Crop + Ori
          </Badge>
        )}
        {!group.crop && group.ori && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Originale seule
          </Badge>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold truncate text-gray-100 text-base mb-1" title={image.name}>
          {image.name}
        </h3>
        <div className="flex flex-wrap gap-2 items-center text-xs mb-2">
          {image.type !== 'Autre' && (
            <Badge
              variant={
                image.type === 'Couverture'
                  ? 'default'
                  : image.type === 'Événement'
                    ? 'secondary'
                    : 'ghost'
              }
              size="sm"
            >
              {image.type}
            </Badge>
          )}
          <span className="text-purple-300 font-mono text-xs">
            {(image.size / 1024).toFixed(1)} Ko
          </span>
        </div>
        {group.linkedTo && (
          <div className="mt-2 w-full">
            <span
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm w-full min-h-[2.5rem] ${
                group.linkedTo.type === 'track'
                  ? 'bg-purple-700/30 text-purple-200'
                  : 'bg-blue-700/30 text-blue-200'
              } whitespace-nowrap overflow-hidden transition-colors duration-200 hover:bg-opacity-50`}
              title={group.linkedTo.title}
            >
              {group.linkedTo.type === 'track' ? (
                <Music className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Calendar className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="truncate">{group.linkedTo.title}</span>
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-row gap-1 justify-center items-center py-3 px-2 bg-gray-900/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(image);
          }}
          className="hover:bg-purple-900/30 rounded-lg"
        >
          <Download className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:bg-red-900/30 rounded-lg"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image);
          }}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
