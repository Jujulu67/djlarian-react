'use client';

import { Filter } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  ProjectTable,
  Project,
  ProjectStatus,
  ImportProjectsDialog,
  ImportStreamsDialog,
  ReleaseCalendar,
} from '@/components/projects';
import { ParsedProjectRow } from '@/lib/utils/parseExcelData';
import { exportProjectsToExcel } from '@/lib/utils/exportProjectsToExcel';
import { fetchWithAuth, isAuthError, getErrorMessage } from '@/lib/api/fetchWithAuth';
import { StreamsMilestones } from '@/lib/utils/calculateStreamsMilestones';
import { ProjectAssistant } from '@/components/ProjectAssistant';

import {
  filterAndSortProjects,
  getFieldOptions as getFieldOptionsFor,
  type FieldFilters,
  type SortDirection,
  type SortField,
} from './projectsFiltering';
import { ProjectsToolbar } from './components/ProjectsToolbar';
import { useAssistantProjectSync } from './hooks/useAssistantProjectSync';
import { useNotificationHighlight } from './hooks/useNotificationHighlight';
import { useScrollToNewProject } from './hooks/useScrollToNewProject';

interface ProjectsClientProps {
  initialProjects: Project[];
}

export const ProjectsClient = ({ initialProjects }: ProjectsClientProps) => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<{
    total: number;
    statusBreakdown: Record<string, number>;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportStreamsDialogOpen, setIsImportStreamsDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [lastCreatedProjectId, setLastCreatedProjectId] = useState<string | null>(null);
  const [lastUpdatedProjectId, setLastUpdatedProjectId] = useState<string | null>(null);
  const [highlightedFromNotification, setHighlightedFromNotification] = useState<string | null>(
    null
  );
  const [showReleasedProjects, setShowReleasedProjects] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(false); // Masquer les stats par défaut
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
  const fetchCountsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref pour suivre les mises à jour en cours et éviter les race conditions
  const updatingProjectsRef = useRef<Set<string>>(new Set());

  // Vérifier les releases en approche au chargement initial
  useEffect(() => {
    // Vérifier les releases en approche en arrière-plan
    fetchWithAuth('/api/projects/releases/check').catch(() => {
      // Ignorer les erreurs silencieusement
    });
  }, []); // Une seule fois au montage

  // Fonction pour récupérer les compteurs depuis l'API (agrégats SQL optimisés)
  const fetchCounts = useCallback(async () => {
    if (sessionStatus === 'unauthenticated' || sessionStatus === 'loading' || !session?.user?.id) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/projects/counts`);
      if (response.ok) {
        const result = await response.json();
        const countsData = result.data || result;
        setCounts(countsData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des compteurs:', error);
    }
  }, [sessionStatus, session]);

  const fetchProjects = useCallback(async () => {
    // Vérifier que la session est authentifiée avant de faire la requête
    if (sessionStatus === 'unauthenticated') {
      setAuthError('Votre session a expiré. Veuillez vous reconnecter.');
      router.push('/');
      return;
    }

    if (sessionStatus === 'loading') {
      // Attendre que la session soit chargée
      return;
    }

    if (!session?.user?.id) {
      setAuthError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      // Ajouter un paramètre de cache-busting pour forcer le rechargement après ajout de note
      // et utiliser cache: 'no-store' pour éviter le cache du navigateur
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetchWithAuth(`/api/projects${cacheBuster}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const result = await response.json();
        // Nouveau format API: { data: [...] }
        const fetchedProjects: Project[] = result.data || result;
        setAllProjects(fetchedProjects);
        // Filtrer côté client au lieu de refaire un appel API
        const filteredProjects =
          statusFilter === 'ALL'
            ? fetchedProjects
            : fetchedProjects.filter((p) => p.status === statusFilter);
        setProjects(filteredProjects);
        setAuthError(null);

        // Récupérer les compteurs depuis l'API optimisée (en parallèle, non bloquant)
        fetchWithAuth(`/api/projects/counts`)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            return null;
          })
          .then((result) => {
            if (result) {
              const countsData = result.data || result;
              setCounts(countsData);
            }
          })
          .catch(() => {
            // Ignorer les erreurs silencieusement
          });

        // Vérifier les releases en approche en arrière-plan (ne pas bloquer l'affichage)
        fetchWithAuth('/api/projects/releases/check').catch(() => {
          // Ignorer les erreurs silencieusement
        });
      } else if (isAuthError(response)) {
        // Erreur d'authentification - fetchWithAuth devrait déjà avoir géré la déconnexion
        const errorMessage = await getErrorMessage(response);
        setAuthError(errorMessage || 'Votre session a expiré. Déconnexion en cours...');
        console.error("Erreur d'authentification:", errorMessage);
      } else {
        const error = await response.json();
        console.error('Erreur lors du chargement:', error.error || error);
        setAuthError(error.error || 'Erreur lors du chargement des projets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setAuthError('Erreur lors du chargement des projets. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, session, router]);

  // Filtrer côté client quand on change de filtre (pas besoin de refaire un appel API)
  useEffect(() => {
    if (allProjects.length > 0) {
      const filteredProjects =
        statusFilter === 'ALL' ? allProjects : allProjects.filter((p) => p.status === statusFilter);
      setProjects(filteredProjects);
    }
  }, [statusFilter, allProjects]);

  // Charger les projets et compteurs au montage et quand nécessaire
  useEffect(() => {
    // Vérifier si les initialProjects correspondent déjà aux filtres actuels
    // Si statusFilter est 'ALL' et qu'on a déjà des projets, pas besoin de recharger
    if (statusFilter === 'ALL' && initialProjects.length > 0 && allProjects.length === 0) {
      // Utiliser les projets initiaux si on n'a pas encore chargé
      setAllProjects(initialProjects);
      setProjects(initialProjects);
      // Charger les compteurs
      fetchCounts();
      return;
    }

    // Si on n'a pas encore chargé les projets, les charger
    if (allProjects.length === 0) {
      // Annuler le timeout précédent si il existe
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Définir un nouveau timeout
      fetchTimeoutRef.current = setTimeout(() => {
        fetchProjects();
      }, 300);
    }

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchProjects, fetchCounts, statusFilter, initialProjects, allProjects.length]);

  const handleUpdate = async (id: string, field: string, value: string | number | null) => {
    // Protection contre les race conditions : ignorer si une mise à jour est déjà en cours pour ce projet
    if (updatingProjectsRef.current.has(id)) {
      return;
    }

    // Marquer ce projet comme en cours de mise à jour
    updatingProjectsRef.current.add(id);

    // Trouver le projet actuel pour vérifier le statut
    const currentProject = projects.find((p) => p.id === id);
    // Sauvegarder l'état actuel pour le revert en cas d'erreur
    const previousProjectState = currentProject ? { ...currentProject } : null;

    // Si on change le statut vers TERMINE, forcer progress à 100
    let updatePayload: Record<string, unknown> = { [field]: value };
    if (field === 'status' && value === 'TERMINE') {
      updatePayload.progress = 100;
    }

    const applyUpdate = (list: Project[]) =>
      list.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value, updatedAt: new Date().toISOString() };
          if (field === 'status' && value === 'TERMINE') {
            updated.progress = 100;
          } else if (p.status === 'TERMINE' && field !== 'progress' && field !== 'status') {
            updated.progress = updated.progress ?? 100;
          }
          return updated;
        }
        return p;
      });

    // Optimistic update
    setProjects((prev) => applyUpdate(prev));
    setAllProjects((prev) => applyUpdate(prev));

    try {
      const response = await fetchWithAuth(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();
      const updated = result.data || result;
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setAllProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));

      // Si on a modifié la releaseDate, vérifier les notifications de releases en approche
      if (field === 'releaseDate') {
        fetchWithAuth(`/api/projects/releases/check?projectId=${id}`).catch(() => {
          // Ignorer les erreurs silencieusement
        });
      }

      // Désactiver définitivement l'animation dorée et activer l'animation de modification
      setHighlightedFromNotification(null);
      setLastUpdatedProjectId(id);
      setTimeout(() => {
        setLastUpdatedProjectId(null);
      }, 2000);

      // Si on a changé le statut, rafraîchir les compteurs
      if (field === 'status') {
        fetchCounts();
      }
    } catch (error) {
      console.error('Erreur:', error);
      // Revert on error : restaurer l'état précédent au lieu de recharger tous les projets
      if (previousProjectState) {
        setProjects((prev) => prev.map((p) => (p.id === id ? previousProjectState : p)));
        setAllProjects((prev) => prev.map((p) => (p.id === id ? previousProjectState : p)));
      } else {
        // Si on n'a pas l'état précédent, recharger uniquement ce projet
        fetchWithAuth(`/api/projects/${id}`)
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error('Failed to fetch project');
          })
          .then((result) => {
            const updated = result.data || result;
            setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
            setAllProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
          })
          .catch(() => {
            // En dernier recours, recharger tous les projets
            fetchProjects();
          });
      }
    } finally {
      // Retirer le projet de la liste des mises à jour en cours
      updatingProjectsRef.current.delete(id);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setAllProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      const response = await fetchWithAuth(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      // Rafraîchir les compteurs depuis l'API
      fetchCounts();
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
      const response = await fetchWithAuth('/api/projects/purge', {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la purge');
      }

      const result = await response.json();
      const data = result.data || result;

      alert(`${data.deletedCount || projects.length} projet(s) supprimé(s) avec succès.`);

      // Rafraîchir la liste (qui sera vide maintenant)
      await fetchProjects();
    } catch (error) {
      console.error('Erreur lors de la purge:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la suppression des projets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; status: ProjectStatus }) => {
    try {
      const response = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          throw new Error(errorMessage || "Erreur d'authentification");
        }
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      const result = await response.json();
      const newProject = result.data || result;

      // Ajouter le projet en bas de la liste
      setAllProjects((prev) => [...prev, newProject]);
      setProjects((prev) => {
        if (statusFilter === 'ALL' || newProject.status === statusFilter) {
          return [...prev, newProject];
        }
        return prev;
      });

      // Rafraîchir les compteurs depuis l'API
      fetchCounts();

      // Si le projet a une releaseDate, vérifier les notifications de releases en approche
      if (newProject.releaseDate) {
        fetchWithAuth(`/api/projects/releases/check?projectId=${newProject.id}`).catch(() => {
          // Ignorer les erreurs silencieusement
        });
      }

      // Réinitialiser les tris
      setSortField(null);
      setSortDirection('asc');

      // Désactiver l'animation dorée et activer l'animation de création
      setHighlightedFromNotification(null);
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
      const response = await fetchWithAuth('/api/projects/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: parsedProjects, overwriteDuplicates }),
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          throw new Error(errorMessage || "Erreur d'authentification");
        }
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

  const handleImportStreams = async (
    imports: Array<{ projectId: string; milestones: StreamsMilestones }>
  ) => {
    try {
      const response = await fetchWithAuth('/api/projects/streams/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imports }),
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          throw new Error(errorMessage || "Erreur d'authentification");
        }
        const error = await response.json();
        throw new Error(error.error || error.message || "Erreur lors de l'import des streams");
      }

      const result = await response.json();
      const importResult = result.data || result;

      // Rafraîchir la liste pour voir les streams mis à jour
      await fetchProjects();

      return importResult;
    } catch (error) {
      console.error("Erreur lors de l'import des streams:", error);
      throw error;
    }
  };

  const handleReorder = async (reorderedProjects: Project[]) => {
    // Optimistic update
    setProjects(reorderedProjects);
    setAllProjects((prev) => {
      const reorderedIds = reorderedProjects.map((p) => p.id);
      const remaining = prev.filter((p) => !reorderedIds.includes(p.id));
      return [...reorderedProjects, ...remaining];
    });

    try {
      const projectOrders = reorderedProjects.map((project, index) => ({
        id: project.id,
        order: index,
      }));

      const response = await fetchWithAuth('/api/projects/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectOrders }),
      });

      if (!response.ok) {
        if (isAuthError(response)) {
          const errorMessage = await getErrorMessage(response);
          setAuthError(errorMessage || 'Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/');
          throw new Error(errorMessage || "Erreur d'authentification");
        }
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

  const handleExportExcel = async () => {
    try {
      const projectsToExport =
        filteredAndSortedProjects.length > 0 ? filteredAndSortedProjects : projects;
      const date = new Date().toISOString().split('T')[0];
      const filename = `projets_${date}.xlsx`;
      await exportProjectsToExcel(projectsToExport, filename);
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

  const getFieldOptions = (field: keyof FieldFilters): string[] =>
    getFieldOptionsFor(projects, field);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(
    () =>
      filterAndSortProjects(projects, {
        statusFilter,
        searchTerm,
        fieldFilters,
        showReleasedProjects,
        highlightedFromNotification,
        sortField,
        sortDirection,
      }),
    [
      projects,
      statusFilter,
      searchTerm,
      fieldFilters,
      sortField,
      sortDirection,
      showReleasedProjects,
      highlightedFromNotification, // Inclure pour forcer le recalcul si le highlight change
    ]
  );
  useNotificationHighlight({ setHighlightedFromNotification });
  useAssistantProjectSync({
    setHighlightedFromNotification,
    lastCreatedProjectId,
    setLastCreatedProjectId,
    fetchCounts,
    fetchProjects,
    handleCreate,
    projects,
    setAllProjects,
    setProjects,
    setLastUpdatedProjectId,
    setSortDirection,
    setSortField,
    statusFilter,
  });
  useScrollToNewProject({
    filteredAndSortedProjects,
    lastCreatedProjectId,
    setLastCreatedProjectId,
  });

  // Afficher un message de chargement si la session est en cours de validation
  if (sessionStatus === 'loading') {
    return (
      <div className="space-y-2">
        <div className="glass-modern rounded-xl p-4 sm:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Mes Projets</h1>
            <p className="text-gray-400 text-sm">Vérification de la session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="glass-modern rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Mes Projets</h1>
          <p className="text-gray-400 text-sm">Gère tes projets musicaux et suis leur évolution</p>
        </div>
      </div>

      {/* Message d'erreur d'authentification */}
      {authError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
          <p className="font-medium">{authError}</p>
          <p className="text-sm text-red-400 mt-1">Redirection en cours...</p>
        </div>
      )}

      {/* Calendrier des sorties */}
      <ReleaseCalendar projects={filteredAndSortedProjects} onUpdate={handleUpdate} />

      {/* Filtres et actions */}
      <ProjectsToolbar
        allProjects={allProjects}
        counts={counts}
        fieldFilters={fieldFilters}
        getFieldOptions={getFieldOptions}
        handleFieldFilterChange={handleFieldFilterChange}
        searchTerm={searchTerm}
        setFieldFilters={setFieldFilters}
        setSearchTerm={setSearchTerm}
        setShowFilters={setShowFilters}
        setShowReleasedProjects={setShowReleasedProjects}
        setShowStats={setShowStats}
        setSortDirection={setSortDirection}
        setSortField={setSortField}
        setStatusFilter={setStatusFilter}
        showFilters={showFilters}
        showReleasedProjects={showReleasedProjects}
        showStats={showStats}
        sortField={sortField}
        statusFilter={statusFilter}
      />

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
        onImportStreams={() => setIsImportStreamsDialogOpen(true)}
        onExport={handleExportExcel}
        onPurge={handlePurge}
        isLoading={isLoading}
        projectsCount={projects.length}
        highlightedProjectId={
          lastCreatedProjectId || lastUpdatedProjectId || highlightedFromNotification
        }
        persistentHighlight={
          !!highlightedFromNotification && !lastCreatedProjectId && !lastUpdatedProjectId
        }
        showStats={showStats}
        defaultStatus={statusFilter}
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

      {/* Dialog d'import streams */}
      <ImportStreamsDialog
        isOpen={isImportStreamsDialogOpen}
        onClose={() => setIsImportStreamsDialogOpen(false)}
        onImport={handleImportStreams}
        projects={projects}
      />

      {/* Assistant IA avec accès aux projets en mémoire */}
      <ProjectAssistant projects={allProjects} />
    </div>
  );
};
