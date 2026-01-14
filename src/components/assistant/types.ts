/**
 * Types pour le composant ProjectAssistant
 *
 * Note: QueryFilters is re-exported from the domain layer.
 * Other UI-specific types remain here.
 */
import type { Project } from '@/lib/domain/projects';

// Re-export QueryFilters from domain layer (canonical source)
export type { QueryFilters } from '@/lib/domain/projects';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: {
    projects: Project[];
    type: 'count' | 'list' | 'search' | 'create' | 'update';
    fieldsToShow: string[];
    displayMode?: 'compact' | 'detailed';
  };
  updateConfirmation?: {
    filters: import('@/lib/domain/projects').QueryFilters;
    updateData: UpdateData;
    affectedProjects: Project[];
    affectedProjectIds?: string[];
    scopeSource?: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
    fieldsToShow?: string[];
    requestId?: string;
    previewDiff?: Array<{ id: string; name: string; changes: string[] }>;
    confirmationId?: string; // ID unique pour l'idempotency (évite les doubles mutations)
    expectedUpdatedAtById?: Record<string, string>; // Mapping ID projet → updatedAt attendu (ISO string) pour vérification concurrency optimiste
  };
  scopeConfirmation?: {
    proposedMutation: UpdateData;
    totalProjectsCount: number;
  };
}

export interface UpdateData {
  newProgress?: number;
  newStatus?: string;
  newDeadline?: string;
  pushDeadlineBy?: {
    days?: number;
    weeks?: number;
    months?: number;
    years?: number;
  };
  newCollab?: string;
  newStyle?: string;
  newLabel?: string;
  newLabelFinal?: string;
  projectName?: string;
  newNote?: string;
}

export interface CreateData {
  name: string;
  collab?: string;
  deadline?: string;
  progress?: number;
  status?: string;
  style?: string;
}

export interface ParsedQueryUpdateData extends UpdateData {
  minProgress?: number;
  maxProgress?: number;
  status?: string;
  hasDeadline?: boolean;
  deadlineDate?: string;
  noProgress?: boolean;
}

export interface ParsedQuery {
  filters: import('@/lib/domain/projects').QueryFilters;
  type: 'count' | 'list' | 'search' | 'create' | 'update';
  understood: boolean;
  clarification?: string;
  fieldsToShow?: string[];
  isConversational?: boolean;
  createData?: CreateData;
  updateData?: ParsedQueryUpdateData;
  lang?: string;
}

export interface ProjectAssistantProps {
  projects: Project[];
}
