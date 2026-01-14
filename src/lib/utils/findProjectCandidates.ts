/**
 * Détection de projets candidats basée sur la similarité de nom
 */

import type { Project } from '@/lib/domain/projects';

export interface ProjectCandidate {
  project: Project;
  score: number;
  reason: string;
}

/**
 * Normalise un nom pour la comparaison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, ' '); // Normaliser les espaces
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calcule un score de similarité entre 0 et 100
 */
function calculateSimilarityScore(str1: string, str2: string): number {
  const normalized1 = normalizeName(str1);
  const normalized2 = normalizeName(str2);

  // Match exact
  if (normalized1 === normalized2) {
    return 100;
  }

  // Contient le nom
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 80;
  }

  // Similarité Levenshtein
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Si la distance est trop grande par rapport à la longueur, considérer comme non similaire
  if (distance > maxLength * 0.5) {
    return 0; // Pas de similarité
  }

  const similarity = (1 - distance / maxLength) * 100;

  // Ajuster pour que le score soit entre 50 et 79 (seuil minimum de 50%)
  return Math.max(50, Math.min(79, Math.round(similarity)));
}

/**
 * Trouve les projets candidats basés sur la similarité de nom
 */
export function findProjectCandidates(
  projectName: string,
  projects: Project[],
  maxCandidates: number = 5
): ProjectCandidate[] {
  const candidates: ProjectCandidate[] = [];

  for (const project of projects) {
    const score = calculateSimilarityScore(projectName, project.name);

    let reason = '';
    if (score === 100) {
      reason = 'Match exact';
    } else if (score >= 80) {
      reason = 'Nom contenu';
    } else {
      reason = 'Similarité';
    }

    candidates.push({
      project,
      score,
      reason,
    });
  }

  // Filtrer les candidats avec un score trop faible (< 50%)
  const validCandidates = candidates.filter((c) => c.score >= 50);

  // Trier par score décroissant
  validCandidates.sort((a, b) => b.score - a.score);

  // Retourner les meilleurs candidats
  return validCandidates.slice(0, maxCandidates);
}
