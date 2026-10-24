import type { Project, ProjectStatus } from '@/components/projects/types';

export type SortField = keyof Project | null;
export type SortDirection = 'asc' | 'desc';

export interface FieldFilters {
  name: string;
  style: string;
  collab: string;
  label: string;
  labelFinal: string;
  externalLink: string;
}

// Get unique values for each field for the listbox options
export function getFieldOptions(projects: Project[], field: keyof FieldFilters): string[] {
  const values = projects
    .map((p) => p[field] as string | null)
    .filter((v): v is string => v !== null && v !== '' && v.trim() !== '')
    .map((v) => v.trim());
  return Array.from(new Set(values)).sort();
}

export interface ProjectFilters {
  statusFilter: ProjectStatus | 'ALL';
  searchTerm: string;
  fieldFilters: FieldFilters;
  showReleasedProjects: boolean;
  highlightedFromNotification: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
}

// Filter and sort projects
export function filterAndSortProjects(
  projects: Project[],
  {
    statusFilter,
    searchTerm,
    fieldFilters,
    showReleasedProjects,
    highlightedFromNotification,
    sortField,
    sortDirection,
  }: ProjectFilters
): Project[] {
  let filtered = projects;
  let highlightedProject: Project | undefined;

  // Si un projet est mis en évidence depuis une notification, le garder en mémoire
  if (highlightedFromNotification) {
    highlightedProject = projects.find((p) => p.id === highlightedFromNotification);
  }

  // Filter by status
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Filter by search term (searches in name, style, collab, label)
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.style && p.style.toLowerCase().includes(search)) ||
        (p.collab && p.collab.toLowerCase().includes(search)) ||
        (p.label && p.label.toLowerCase().includes(search)) ||
        (p.labelFinal && p.labelFinal.toLowerCase().includes(search))
    );
  }

  // Filter by field filters
  Object.entries(fieldFilters).forEach(([field, value]) => {
    if (value.trim()) {
      const search = value.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const fieldValue = p[field as keyof Project];
        return fieldValue && String(fieldValue).toLowerCase().includes(search);
      });
    }
  });

  // Filter by release date (hide released projects if checkbox is unchecked)
  if (!showReleasedProjects) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    filtered = filtered.filter((p) => {
      if (!p.releaseDate) return true; // Keep projects without release date
      const releaseDate = new Date(p.releaseDate);
      releaseDate.setHours(0, 0, 0, 0);
      return releaseDate > today; // Keep only projects with release date > today
    });
  }

  // Si le projet mis en évidence n'est pas dans la liste filtrée, l'ajouter en premier
  if (highlightedProject && !filtered.some((p) => p.id === highlightedProject!.id)) {
    filtered = [highlightedProject, ...filtered];
  }

  // Sort
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle date strings (ISO format)
      if (sortField === 'releaseDate' || sortField === 'createdAt' || sortField === 'updatedAt') {
        const aDate = aValue ? new Date(aValue as string).getTime() : 0;
        const bDate = bValue ? new Date(bValue as string).getTime() : 0;
        const comparison = aDate - bDate;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Fallback to string comparison
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  return filtered;
}
