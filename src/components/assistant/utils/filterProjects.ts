/**
 * Re-export filterProjects from domain layer
 *
 * This file exists for backward compatibility.
 * The canonical source of truth is now: @/lib/domain/projects
 */

export { filterProjects } from '@/lib/domain/projects';
export type { FilterResult } from '@/lib/domain/projects';
