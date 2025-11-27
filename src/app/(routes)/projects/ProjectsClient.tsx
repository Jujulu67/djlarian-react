'use client';

import { Filter, RefreshCw, Upload, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

import {
  ProjectTable,
  Project,
  ProjectStatus,
  PROJECT_STATUSES,
  ImportProjectsDialog,
} from '@/components/projects';
import { ParsedProjectRow } from '@/lib/utils/parseExcelData';

interface ProjectsClientProps {
  initialProjects: Project[];
}

export const ProjectsClient = ({ initialProjects }: ProjectsClientProps) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
      setProjects((prev) => [newProject, ...prev]);
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

  const filteredProjects =
    statusFilter === 'ALL' ? projects : projects.filter((p) => p.status === statusFilter);

  // Stats rapides
  const stats = {
    total: projects.length,
    enCours: projects.filter((p) => p.status === 'EN_COURS').length,
    termine: projects.filter((p) => p.status === 'TERMINE').length,
    ghost: projects.filter((p) => p.status === 'GHOST_PRODUCTION').length,
  };

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="glass-modern rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Mes Projets</h1>
            <p className="text-gray-400 text-sm">
              Gère tes projets musicaux et suis leur évolution
            </p>
          </div>

          {/* Stats rapides */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center px-4 py-2 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-400 text-xs">Total</div>
            </div>
            <div className="text-center px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{stats.enCours}</div>
              <div className="text-gray-400 text-xs">En cours</div>
            </div>
            <div className="text-center px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">{stats.termine}</div>
              <div className="text-gray-400 text-xs">Terminés</div>
            </div>
            <div className="hidden sm:block text-center px-4 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">{stats.ghost}</div>
              <div className="text-gray-400 text-xs">Ghost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={16} />
          <span className="text-sm">Filtre :</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {status.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIsImportDialogOpen(true)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            title="Importer depuis Excel"
            aria-label="Importer des projets depuis Excel"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Importer Excel</span>
          </button>
          <button
            onClick={fetchProjects}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
            title="Rafraîchir"
            aria-label="Rafraîchir la liste des projets"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button
            onClick={handlePurge}
            disabled={isLoading || projects.length === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            title="Supprimer tous les projets"
            aria-label="Purger tous les projets"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Purger</span>
          </button>
        </div>
      </div>

      {/* Tableau */}
      <ProjectTable
        projects={filteredProjects}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreate={handleCreate}
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
