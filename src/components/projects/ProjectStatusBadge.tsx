'use client';

import { useEffect, useState } from 'react';
import { PROJECT_STATUSES, ProjectStatus } from './types';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/30 text-blue-200 border-blue-400/50 backdrop-blur-md',
  green: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 backdrop-blur-md',
  red: 'bg-red-500/30 text-red-200 border-red-400/50 backdrop-blur-md',
  orange: 'bg-amber-500/30 text-amber-200 border-amber-400/50 backdrop-blur-md',
  purple: 'bg-purple-500/30 text-purple-200 border-purple-400/50 backdrop-blur-md',
  slate: 'bg-slate-500/30 text-slate-200 border-slate-400/50 backdrop-blur-md',
};

export const ProjectStatusBadge = ({ status, size = 'sm' }: ProjectStatusBadgeProps) => {
  const [badgeWidth, setBadgeWidth] = useState<number | undefined>(undefined);
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);

  // Calculer la largeur maximale nécessaire pour tous les statuts
  useEffect(() => {
    const calculateMaxWidth = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        setBadgeWidth(undefined);
        return;
      }

      const fontSize = size === 'sm' ? '12px' : '14px';
      const fontFamily = 'system-ui, -apple-system, sans-serif';
      const fontWeight = '500';
      context.font = `${fontWeight} ${fontSize} ${fontFamily}`;

      // Trouver le label le plus large parmi tous les statuts
      const maxWidth = PROJECT_STATUSES.reduce((max, status) => {
        const metrics = context.measureText(status.label);
        return Math.max(max, metrics.width);
      }, 0);

      // Ajouter le padding horizontal
      const paddingX = 24; // px-3 = 12px de chaque côté = 24px total
      const calculatedWidth = Math.ceil(maxWidth + paddingX);

      setBadgeWidth(calculatedWidth);
    };

    calculateMaxWidth();
  }, [size]);

  if (!statusConfig) return null;

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border bg-gray-900/40 backdrop-blur-md ${sizeClasses} ${colorMap[statusConfig.color] || colorMap.blue}`}
      style={{
        minWidth: badgeWidth ? `${badgeWidth}px` : 'auto',
        width: badgeWidth ? `${badgeWidth}px` : 'auto',
      }}
    >
      {statusConfig.label}
    </span>
  );
};
