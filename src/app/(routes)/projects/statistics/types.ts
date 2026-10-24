import type { Project } from '@/components/projects/types';

// Types pour les composants Recharts
export interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: Record<string, unknown>;
    value?: number;
    dataKey?: string;
  }>;
  label?: string | number;
}

export interface SegmentLabelProps {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  payload?: Record<string, unknown>;
  value?: number;
}

export interface StatisticsClientProps {
  initialProjects: Project[];
}

export interface StatisticsData {
  totalProjects: number;
  statusBreakdown: {
    TERMINE: number;
    EN_COURS: number;
    ANNULE: number;
    A_REWORK: number;
    GHOST_PRODUCTION: number;
  };
  projectsByYear: Array<{
    year: string;
    TERMINE: number;
    GHOST_PRODUCTION: number;
    total: number;
  }>;
  projectsByYearDetails: Record<string, Array<{ id: string; name: string; releaseDate: string }>>;
  streamsEvolution: Array<{
    projectId: string;
    projectName: string;
    style: string | null;
    releaseDate: string | null;
    streams: Array<{ day: number; value: number }>;
  }>;
  globalStreamsEvolution: Array<{ day: number; value: number }>;
  metrics: {
    averageStreams: {
      J7: number;
      J14: number;
      J21: number;
      J28: number;
      J56: number;
      J84: number;
      J180?: number;
      J365?: number;
    };
    totalStreams: number;
    maxStreams: number;
    projectsWithStreams: number;
  };
}

// Constante pour les jalons de jours
export const MILESTONE_DAYS = [7, 14, 21, 28, 56, 84, 180, 365] as const;
export const MILESTONE_LABELS = ['J7', 'J14', 'J21', 'J28', 'J56', 'J84', 'J180', 'J365'] as const;
