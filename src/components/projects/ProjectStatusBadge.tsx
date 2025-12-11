'use client';

import { PROJECT_STATUSES, ProjectStatus } from './types';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  orange: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  slate: 'bg-slate-500/25 text-slate-200 border-slate-400/30',
};

export const ProjectStatusBadge = ({ status, size = 'sm' }: ProjectStatusBadgeProps) => {
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);

  if (!statusConfig) return null;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${colorMap[statusConfig.color] || colorMap.blue}`}
    >
      {statusConfig.label}
    </span>
  );
};
