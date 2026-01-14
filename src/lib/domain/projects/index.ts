/**
 * Domain layer for Projects
 *
 * This module is the canonical source of truth for project-related types and logic.
 * Components and other modules should re-export from here.
 */

// Types
export type { Project, ProjectStatus, LabelStatus, EditableField, CellType } from './types';

export { PROJECT_STATUSES, LABEL_OPTIONS } from './types';

// Filters
export type { QueryFilters } from './filters';

// Filter logic
export { filterProjects } from './filter-projects';
export type { FilterResult } from './filter-projects';
