import type { StreamsCsvData } from '@/lib/utils/parseStreamsCsv';
import type { ProjectCandidate } from '@/lib/utils/findProjectCandidates';
import type { StreamsMilestones } from '@/lib/utils/calculateStreamsMilestones';

export interface ImportStreamsResult {
  success: boolean;
  updated: number;
  failed: number;
  errors?: Array<{ fileName: string; error: string }>;
}

export interface FileImportData {
  file: File;
  csvData: StreamsCsvData;
  candidates: ProjectCandidate[];
  selectedProjectId: string | null;
  milestones: StreamsMilestones | null;
  error?: string;
  isValidated?: boolean; // Nouveau: indique si le fichier a été validé
}

export type DialogStep = 'upload' | 'preview' | 'result';
export type FileStatus = 'pending' | 'validated' | 'error';
