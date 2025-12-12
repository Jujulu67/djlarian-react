/**
 * Types pour le composant ProjectAssistant
 */
import type { Project } from '@/components/projects/types';

// Type pour les filtres de requête extraits par l'IA
export interface QueryFilters {
  status?: string;
  minProgress?: number;
  maxProgress?: number;
  collab?: string;
  style?: string;
  label?: string;
  hasDeadline?: boolean;
  name?: string;
  noProgress?: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: {
    projects: Project[];
    type: 'count' | 'list' | 'search' | 'create' | 'update';
    fieldsToShow: string[];
  };
  updateConfirmation?: {
    filters: QueryFilters;
    updateData: UpdateData;
    affectedProjects: Project[];
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
  filters: QueryFilters;
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
