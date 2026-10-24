import { PROJECT_STATUSES } from '../types';
import type { CellType, Project, ProjectStatus } from '../types';

export type SortField = keyof Project | null;
export type SortDirection = 'asc' | 'desc';

export interface ColumnConfig {
  key: string;
  label: string;
  type: CellType;
  width?: string;
  minWidth?: string;
  hideOnMobile?: boolean;
}

// Configuration des colonnes en mode normal (large écran >= 1280px)
// Largeurs fixes pour éviter les débordements
export const columnsNormal: ColumnConfig[] = [
  { key: 'name', label: 'Nom Projet', type: 'text', width: '150px', minWidth: '120px' },
  { key: 'style', label: 'Style', type: 'text', width: '85px', minWidth: '80px' },
  { key: 'status', label: 'Statut', type: 'select', width: '95px', minWidth: '100px' },
  { key: 'progress', label: '% Avancement', type: 'progress', width: '85px', minWidth: '90px' },
  { key: 'collab', label: 'Collab', type: 'text', width: '100px', minWidth: '80px' },
  { key: 'label', label: 'Label', type: 'select', width: '85px', minWidth: '80px' },
  { key: 'labelFinal', label: 'Label Final', type: 'text', width: '90px', minWidth: '80px' },
  { key: 'deadline', label: 'Deadline', type: 'date', width: '95px', minWidth: '100px' },
  { key: 'releaseDate', label: 'Date Sortie', type: 'date', width: '95px', minWidth: '100px' },
  { key: 'streamsJ7', label: 'J7', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ14', label: 'J14', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ21', label: 'J21', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ28', label: 'J28', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ56', label: 'J56', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ84', label: 'J84', type: 'number', width: '55px', minWidth: '55px' },
  { key: 'streamsJ180', label: 'J180', type: 'number', width: '60px', minWidth: '60px' },
  { key: 'streamsJ365', label: 'J365', type: 'number', width: '60px', minWidth: '60px' },
];

// Configuration des colonnes en mode compact (écran moyen)
export const columnsCompact: ColumnConfig[] = [
  { key: 'name', label: 'Nom', type: 'text', minWidth: '60px', width: '80px' },
  { key: 'style', label: 'Style', type: 'text', minWidth: '45px', width: '55px' },
  { key: 'status', label: 'Statut', type: 'select', minWidth: '60px', width: '70px' },
  { key: 'progress', label: '%', type: 'progress', minWidth: '45px', width: '55px' },
  { key: 'collab', label: 'Collab', type: 'text', minWidth: '50px', width: '60px' },
  { key: 'label', label: 'Label', type: 'select', minWidth: '45px', width: '55px' },
  { key: 'labelFinal', label: 'Label F', type: 'text', minWidth: '45px', width: '55px' },
  { key: 'deadline', label: 'Deadline', type: 'date', minWidth: '55px', width: '65px' },
  { key: 'releaseDate', label: 'Date', type: 'date', minWidth: '55px', width: '65px' },
  { key: 'streamsJ7', label: 'J7', type: 'number', width: '40px', minWidth: '40px' },
  { key: 'streamsJ14', label: 'J14', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ21', label: 'J21', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ28', label: 'J28', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ56', label: 'J56', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ84', label: 'J84', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ180', label: 'J180', type: 'number', width: '45px', minWidth: '45px' },
  { key: 'streamsJ365', label: 'J365', type: 'number', width: '45px', minWidth: '45px' },
];

// Helper pour obtenir la couleur de bordure selon le statut
export const getStatusBorderColor = (status: ProjectStatus): string => {
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    red: 'border-l-red-500',
    orange: 'border-l-amber-500',
    purple: 'border-l-purple-500',
  };
  return colorMap[statusConfig?.color || 'blue'] || 'border-l-blue-500';
};

// Helper pour obtenir le total des streams
export const getTotalStreams = (project: Project): number => {
  return (
    (project.streamsJ7 || 0) +
    (project.streamsJ14 || 0) +
    (project.streamsJ21 || 0) +
    (project.streamsJ28 || 0) +
    (project.streamsJ56 || 0) +
    (project.streamsJ84 || 0) +
    (project.streamsJ180 || 0) +
    (project.streamsJ365 || 0)
  );
};

export const getCellValue = (project: Project, key: string): string | number | null => {
  return project[key as keyof Project] as string | number | null;
};
