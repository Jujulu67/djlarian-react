import { calculateStreamsMilestones } from '@/lib/utils/calculateStreamsMilestones';
import { findProjectCandidates } from '@/lib/utils/findProjectCandidates';
import { parseStreamsCsv } from '@/lib/utils/parseStreamsCsv';
import type { Project } from '../types';
import type { FileImportData, FileStatus } from './types';

export const NO_RELEASE_DATE_ERROR = "Le projet sélectionné n'a pas de date de release";

/**
 * Convertit une date ISO en date locale au format YYYY-MM-DD
 */
export function toIsoDateOnly(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Analyse le contenu d'un CSV déjà lu : parsing, recherche de candidats,
 * sélection automatique (score >= 80) et calcul des jalons.
 */
export function analyzeStreamsFile(file: File, text: string, projects: Project[]): FileImportData {
  const csvData = parseStreamsCsv(text, file.name);

  if (csvData.errors && csvData.errors.length > 0) {
    return {
      file,
      csvData,
      candidates: [],
      selectedProjectId: null,
      milestones: null,
      error: csvData.errors.join(', '),
    };
  }

  // Trouver les candidats
  const candidates = findProjectCandidates(csvData.projectName, projects);

  // Si un seul candidat avec score élevé, le sélectionner automatiquement
  let selectedProjectId: string | null = null;
  let milestones: ReturnType<typeof calculateStreamsMilestones> | null = null;

  if (candidates.length > 0 && candidates[0].score >= 80) {
    const bestCandidate = candidates[0].project;
    selectedProjectId = bestCandidate.id;

    // Calculer les jalons si on a une date de release
    if (bestCandidate.releaseDate) {
      milestones = calculateStreamsMilestones(
        toIsoDateOnly(bestCandidate.releaseDate),
        csvData.streams
      );
    } else {
      return {
        file,
        csvData,
        candidates,
        selectedProjectId: null,
        milestones: null,
        error: NO_RELEASE_DATE_ERROR,
      };
    }
  }

  return {
    file,
    csvData,
    candidates,
    selectedProjectId,
    milestones,
  };
}

export function getFileStatus(fileData: FileImportData): FileStatus {
  if (fileData.error) return 'error';
  if (fileData.isValidated && fileData.selectedProjectId && fileData.milestones) return 'validated';
  return 'pending';
}

export function getValidatedFiles(filesData: FileImportData[]): FileImportData[] {
  return filesData.filter((f) => f.isValidated && f.selectedProjectId && f.milestones && !f.error);
}
