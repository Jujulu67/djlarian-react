'use client';

import {
  Filter,
  RefreshCw,
  Upload,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  ProjectTable,
  Project,
  ProjectStatus,
  PROJECT_STATUSES,
  ImportProjectsDialog,
  ReleaseCalendar,
} from '@/components/projects';
import { ParsedProjectRow } from '@/lib/utils/parseExcelData';
import { exportProjectsToExcel } from '@/lib/utils/exportProjectsToExcel';
import { Checkbox } from '@/components/ui/Checkbox';

interface ProjectsClientProps {
  initialProjects: Project[];
}

type SortField = keyof Project | null;
type SortDirection = 'asc' | 'desc';

interface FieldFilters {
  name: string;
  style: string;
  collab: string;
  label: string;
  labelFinal: string;
  externalLink: string;
}

export const ProjectsClient = ({ initialProjects }: ProjectsClientProps) => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [lastCreatedProjectId, setLastCreatedProjectId] = useState<string | null>(null);
  const [lastUpdatedProjectId, setLastUpdatedProjectId] = useState<string | null>(null);
  const [showReleasedProjects, setShowReleasedProjects] = useState<boolean>(true);
  const [fieldFilters, setFieldFilters] = useState<FieldFilters>({
    name: '',
    style: '',
    collab: '',
    label: '',
    labelFinal: '',
    externalLink: '',
  });

  // Ref pour le debounce
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        // Nouveau format API: { data: [...] }
        const projects = result.data || result;
        setProjects(projects);
      } else {
        const error = await response.json();
        console.error('Erreur lors du chargement:', error.error || error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Debounce fetchProjects avec 300ms et éviter le double appel SSR + client
  useEffect(() => {
    // Vérifier si les initialProjects correspondent déjà aux filtres actuels
    // Si statusFilter est 'ALL' et qu'on a déjà des projets, pas besoin de recharger
    if (statusFilter === 'ALL' && initialProjects.length > 0 && projects.length === 0) {
      // Utiliser les projets initiaux si on n'a pas encore chargé
      setProjects(initialProjects);
      return;
    }

    // Si le filtre correspond aux projets initiaux, ne pas recharger immédiatement
    if (statusFilter === 'ALL' && initialProjects.length > 0) {
      const filteredInitial = initialProjects.filter(
        (p) => p.status === statusFilter || statusFilter === 'ALL'
      );
      if (filteredInitial.length === initialProjects.length && projects.length === 0) {
        // Les projets initiaux correspondent, utiliser ceux-ci
        setProjects(initialProjects);
        return;
      }
    }

    // Annuler le timeout précédent si il existe
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Définir un nouveau timeout
    fetchTimeoutRef.current = setTimeout(() => {
      fetchProjects();
    }, 300);

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchProjects, statusFilter, initialProjects, projects.length]);

  const handleUpdate = async (id: string, field: string, value: string | number | null) => {
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [field]: value, updatedAt: new Date().toISOString() } : p
      )
    );

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();
      const updated = result.data || result;
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));

      // Déclencher l'animation pour le projet modifié
      setLastUpdatedProjectId(id);
      setTimeout(() => {
        setLastUpdatedProjectId(null);
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      // Revert on error
      fetchProjects();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      fetchProjects();
    }
  };

  const handlePurge = async () => {
    if (projects.length === 0) {
      alert('Aucun projet à supprimer.');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer TOUS vos ${projects.length} projet(s) ?\n\nCette action est irréversible.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    const doubleConfirm = confirm('Confirmez-vous vraiment la suppression de tous vos projets ?');
    if (!doubleConfirm) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/projects/purge', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la purge');
      }

      const result = await response.json();
      const data = result.data || result;

      alert(`${data.deletedCount || projects.length} projet(s) supprimé(s) avec succès.`);

      // Rafraîchir la liste (qui sera vide maintenant)
      await fetchProjects();
    } catch (error: any) {
      console.error('Erreur lors de la purge:', error);
      alert(error.message || 'Erreur lors de la suppression des projets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; status: ProjectStatus }) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      const result = await response.json();
      const newProject = result.data || result;

      // Ajouter le projet en bas de la liste
      setProjects((prev) => [...prev, newProject]);

      // Réinitialiser les tris
      setSortField(null);
      setSortDirection('asc');

      // Stocker l'ID du nouveau projet pour le scroll
      setLastCreatedProjectId(newProject.id);
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  };

  const handleBatchImport = async (
    parsedProjects: ParsedProjectRow[],
    overwriteDuplicates: boolean = false
  ) => {
    try {
      const response = await fetch('/api/projects/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: parsedProjects, overwriteDuplicates }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Erreur lors de l'import");
      }

      const result = await response.json();
      const batchResult = result.data || result;

      // Rafraîchir la liste pour éviter les doublons (surtout si des projets ont été mis à jour)
      await fetchProjects();

      return batchResult;
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      throw error;
    }
  };

  const handleReorder = async (reorderedProjects: Project[]) => {
    // Optimistic update
    setProjects(reorderedProjects);

    try {
      const projectOrders = reorderedProjects.map((project, index) => ({
        id: project.id,
        order: index,
      }));

      const response = await fetch('/api/projects/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectOrders }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour de l'ordre");
      }

      const result = await response.json();
      const updatedProjects = result.data || result;
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Erreur lors du réordonnancement:', error);
      // Revert on error
      fetchProjects();
    }
  };

  const handleExportExcel = () => {
    try {
      const projectsToExport =
        filteredAndSortedProjects.length > 0 ? filteredAndSortedProjects : projects;
      const date = new Date().toISOString().split('T')[0];
      const filename = `projets_${date}.xlsx`;
      exportProjectsToExcel(projectsToExport, filename);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      alert("Erreur lors de l'export Excel");
    }
  };

  const handleStatistics = () => {
    router.push('/projects/statistics');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFieldFilterChange = (field: keyof FieldFilters, value: string) => {
    setFieldFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Get unique values for each field for the listbox options
  const getFieldOptions = (field: keyof FieldFilters): string[] => {
    const values = projects
      .map((p) => p[field] as string | null)
      .filter((v): v is string => v !== null && v !== '' && v.trim() !== '')
      .map((v) => v.trim());
    return Array.from(new Set(values)).sort();
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

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
  }, [
    projects,
    statusFilter,
    searchTerm,
    fieldFilters,
    sortField,
    sortDirection,
    showReleasedProjects,
  ]);

  // Scroll vers le nouveau projet après création et réinitialiser l'animation après 2s
  useEffect(() => {
    if (lastCreatedProjectId) {
      // Attendre que le DOM soit mis à jour
      const timer = setTimeout(() => {
        // Scroller jusqu'en bas de la fenêtre
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }, 150);

      // Réinitialiser l'ID après l'animation (2 secondes)
      const resetTimer = setTimeout(() => {
        setLastCreatedProjectId(null);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [lastCreatedProjectId, filteredAndSortedProjects]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="glass-modern rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Mes Projets</h1>
          <p className="text-gray-400 text-sm">Gère tes projets musicaux et suis leur évolution</p>
        </div>
      </div>

      {/* Calendrier des sorties */}
      <ReleaseCalendar projects={filteredAndSortedProjects} onUpdate={handleUpdate} />

      {/* Filtres et actions */}
      <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4">
          {/* Ligne 1: Recherche */}
          <div className="flex gap-3 items-center flex-wrap">
            {/* Champ de recherche */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un projet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900/70 text-white w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
              />
            </div>
          </div>

          {/* Ligne 2: Filtres par statut et checkbox projets sortis */}
          <div className="flex gap-3 items-center flex-wrap">
            {/* Checkbox pour masquer/afficher les projets sortis */}
            <div className="px-3 py-2 bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700/70">
              <Checkbox
                checked={showReleasedProjects}
                onCheckedChange={setShowReleasedProjects}
                label="Afficher les projets sortis"
                labelClassName="text-sm text-gray-300 whitespace-nowrap"
              />
            </div>

            {/* Filtres par statut - scrollables sur mobile */}
            <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg overflow-x-auto flex-1 min-w-0">
              <div className="flex gap-1 min-w-max">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    statusFilter === 'ALL'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  Tous ({projects.length})
                </button>
                {PROJECT_STATUSES.map((status) => {
                  const count = projects.filter((p) => p.status === status.value).length;
                  return (
                    <button
                      key={status.value}
                      onClick={() => setStatusFilter(status.value)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        statusFilter === status.value
                          ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                          : 'text-gray-300 hover:bg-gray-700/60'
                      }`}
                    >
                      {status.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {(searchTerm ||
                Object.values(fieldFilters).some((v) => v.trim()) ||
                sortField !== null) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFieldFilters({
                      name: '',
                      style: '',
                      collab: '',
                      label: '',
                      labelFinal: '',
                      externalLink: '',
                    });
                    setSortField(null);
                    setSortDirection('asc');
                  }}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors px-3 py-2 bg-gray-800/70 rounded-xl border border-gray-700/70 hover:border-purple-500/70"
                  title="Réinitialiser les filtres"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`bg-gray-800/70 p-3 rounded-xl border transition-all ${
                  showFilters
                    ? 'border-purple-500/70 text-purple-400 bg-purple-500/10'
                    : 'border-gray-700/70 text-gray-300 hover:border-gray-500/70'
                }`}
                aria-label="Plus de filtres"
                title="Filtres additionnels"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtres additionnels par champ */}
          {showFilters && (
            <div className="mt-2 pt-4 border-t border-gray-700/50 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom Projet</label>
                  <select
                    value={fieldFilters.name}
                    onChange={(e) => handleFieldFilterChange('name', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Tous les noms</option>
                    {getFieldOptions('name').map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                  <select
                    value={fieldFilters.style}
                    onChange={(e) => handleFieldFilterChange('style', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Tous les styles</option>
                    {getFieldOptions('style').map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Collab */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Collab</label>
                  <select
                    value={fieldFilters.collab}
                    onChange={(e) => handleFieldFilterChange('collab', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Toutes les collabs</option>
                    {getFieldOptions('collab').map((collab) => (
                      <option key={collab} value={collab}>
                        {collab}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Label</label>
                  <select
                    value={fieldFilters.label}
                    onChange={(e) => handleFieldFilterChange('label', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Tous les labels</option>
                    {getFieldOptions('label').map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label Final */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label Final
                  </label>
                  <select
                    value={fieldFilters.labelFinal}
                    onChange={(e) => handleFieldFilterChange('labelFinal', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Tous les labels finaux</option>
                    {getFieldOptions('labelFinal').map((labelFinal) => (
                      <option key={labelFinal} value={labelFinal}>
                        {labelFinal}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lien */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lien</label>
                  <select
                    value={fieldFilters.externalLink}
                    onChange={(e) => handleFieldFilterChange('externalLink', e.target.value)}
                    className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                  >
                    <option value="">Tous les liens</option>
                    {getFieldOptions('externalLink').map((link) => (
                      <option key={link} value={link}>
                        {link}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      <ProjectTable
        projects={filteredAndSortedProjects}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onReorder={handleReorder}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRefresh={fetchProjects}
        onStatistics={handleStatistics}
        onImport={() => setIsImportDialogOpen(true)}
        onExport={handleExportExcel}
        onPurge={handlePurge}
        isLoading={isLoading}
        projectsCount={projects.length}
        highlightedProjectId={lastCreatedProjectId || lastUpdatedProjectId}
      />

      {/* Info aide */}
      <div className="text-center text-gray-500 text-xs py-4">
        💡 Clique sur une cellule pour la modifier • Entrée pour valider • Échap pour annuler
      </div>

      {/* Dialog d'import */}
      <ImportProjectsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleBatchImport}
      />
    </div>
  );
};
