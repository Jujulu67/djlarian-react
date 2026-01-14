/**
 * Types partagés pour les handlers du router
 *
 * Ce module contient les types et interfaces utilisés par plusieurs handlers.
 */

import type { Project, QueryFilters } from '@/lib/domain/projects';
import type { ProjectCommandResult } from '../types';

// ============================================================================
// Types de résultats
// ============================================================================

/**
 * Résultat de la détection de scope pour les mutations
 */
export interface ScopeResult {
  scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
  affectedProjects: Project[];
  effectiveFilters: QueryFilters;
}

/**
 * Résultat de la gestion du "detail intent"
 */
export type DetailIntentResult =
  | { handled: true; result: ProjectCommandResult }
  | { handled: false };

// ============================================================================
// Constantes partagées
// ============================================================================

/**
 * Champs affichés en vue détaillée
 */
export const DETAILED_FIELDS_TO_SHOW = [
  'status',
  'progress',
  'collab',
  'releaseDate',
  'deadline',
  'style',
  'label',
  'labelFinal',
] as const;

// ============================================================================
// Re-exports pour convenance
// ============================================================================

export type { Project, QueryFilters } from '@/lib/domain/projects';
export type {
  ProjectFilter,
  ProjectMutation,
  PendingConfirmationAction,
  RouterContext,
  ProjectCommandResult,
  ProjectPreviewDiff,
} from '../types';
export { ProjectCommandType } from '../types';
