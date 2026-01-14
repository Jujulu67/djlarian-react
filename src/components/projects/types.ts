/**
 * Re-export project types from domain layer
 *
 * This file exists for backward compatibility.
 * The canonical source of truth is now: @/lib/domain/projects
 */

export type {
  Project,
  ProjectStatus,
  LabelStatus,
  EditableField,
  CellType,
} from '@/lib/domain/projects';

export { PROJECT_STATUSES, LABEL_OPTIONS } from '@/lib/domain/projects';
