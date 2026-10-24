'use client';

import { useEffect } from 'react';
import { Project, ProjectStatus } from '@/components/projects';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { type SortDirection, type SortField } from '../projectsFiltering';

interface UseAssistantProjectSyncParams {
  setHighlightedFromNotification: React.Dispatch<React.SetStateAction<string | null>>;
  lastCreatedProjectId: string | null;
  setLastCreatedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchCounts: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  handleCreate: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  projects: Project[];
  setAllProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setLastUpdatedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  statusFilter: ProjectStatus | 'ALL';
}

export function useAssistantProjectSync({
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
}: UseAssistantProjectSyncParams) {
  // Écouter les événements de création de projet depuis l'assistant IA
  useEffect(() => {
    const handleProjectCreatedFromAssistant = (
      event: CustomEvent<{ projectId: string; project?: Project }>
    ) => {
      const { projectId, project } = event.detail;

      // Si les données du projet sont fournies, les ajouter immédiatement à la liste
      if (project) {
        // Ajouter le projet en bas de la liste (comme handleCreate)
        setAllProjects((prev) => [...prev, project]);
        setProjects((prev) => {
          if (statusFilter === 'ALL' || project.status === statusFilter) {
            return [...prev, project];
          }
          return prev;
        });

        // Rafraîchir les compteurs
        fetchCounts();

        // Si le projet a une releaseDate, vérifier les notifications
        if (project.releaseDate) {
          fetchWithAuth(`/api/projects/releases/check?projectId=${project.id}`).catch(() => {
            // Ignorer les erreurs silencieusement
          });
        }

        // Réinitialiser les tris
        setSortField(null);
        setSortDirection('asc');
      }

      // Mettre à jour lastCreatedProjectId pour déclencher le scroll et l'animation
      setLastCreatedProjectId(projectId);
      // Désactiver l'animation dorée si elle était active
      setHighlightedFromNotification(null);
    };

    window.addEventListener(
      'projectCreatedFromAssistant',
      handleProjectCreatedFromAssistant as EventListener
    );

    return () => {
      window.removeEventListener(
        'projectCreatedFromAssistant',
        handleProjectCreatedFromAssistant as EventListener
      );
    };
  }, [statusFilter, fetchCounts]);

  // Écouter les événements de modification de projets depuis l'assistant IA
  useEffect(() => {
    const handleProjectsUpdatedFromAssistant = (
      event: CustomEvent<{
        projectIds: string[];
        updates: {
          progress?: number;
          status?: string;
          deadline?: string | null;
          pushDeadlineBy?: { days?: number; weeks?: number; months?: number };
          collab?: string;
          style?: string;
          label?: string;
          labelFinal?: string;
          note?: boolean;
        };
      }>
    ) => {
      const { projectIds, updates } = event.detail;

      // Mettre à jour les projets dans la liste avec les nouvelles valeurs
      setAllProjects((prev) =>
        prev.map((project) => {
          if (projectIds.includes(project.id)) {
            const updated = { ...project };
            if (updates.progress !== undefined) {
              updated.progress = updates.progress;
            }
            if (updates.status) {
              updated.status = updates.status as ProjectStatus;
              // Si on passe à TERMINE, forcer progress à 100
              if (updates.status === 'TERMINE') {
                updated.progress = 100;
              }
            }
            // Gérer pushDeadlineBy (décalage relatif)
            if (updates.pushDeadlineBy && project.deadline) {
              const currentDeadline = new Date(project.deadline);
              const updatedDeadline = new Date(currentDeadline);

              if (updates.pushDeadlineBy.days !== undefined) {
                updatedDeadline.setDate(updatedDeadline.getDate() + updates.pushDeadlineBy.days);
              }
              if (updates.pushDeadlineBy.weeks !== undefined) {
                updatedDeadline.setDate(
                  updatedDeadline.getDate() + updates.pushDeadlineBy.weeks * 7
                );
              }
              if (updates.pushDeadlineBy.months !== undefined) {
                updatedDeadline.setMonth(
                  updatedDeadline.getMonth() + updates.pushDeadlineBy.months
                );
              }

              updated.deadline = updatedDeadline.toISOString().split('T')[0];
            } else if (updates.deadline !== undefined) {
              // Gérer deadline absolue (ou null pour suppression)
              updated.deadline = updates.deadline;
            }
            if (updates.collab !== undefined) {
              updated.collab = updates.collab;
            }
            if (updates.style !== undefined) {
              updated.style = updates.style;
            }
            if (updates.label !== undefined) {
              updated.label = updates.label;
            }
            if (updates.labelFinal !== undefined) {
              updated.labelFinal = updates.labelFinal;
            }
            updated.updatedAt = new Date().toISOString();
            return updated;
          }
          return project;
        })
      );

      setProjects((prev) =>
        prev.map((project) => {
          if (projectIds.includes(project.id)) {
            const updated = { ...project };
            if (updates.progress !== undefined) {
              updated.progress = updates.progress;
            }
            if (updates.status) {
              updated.status = updates.status as ProjectStatus;
              // Si on passe à TERMINE, forcer progress à 100
              if (updates.status === 'TERMINE') {
                updated.progress = 100;
              }
            }
            // Gérer pushDeadlineBy (décalage relatif)
            if (updates.pushDeadlineBy && project.deadline) {
              const currentDeadline = new Date(project.deadline);
              const updatedDeadline = new Date(currentDeadline);

              if (updates.pushDeadlineBy.days !== undefined) {
                updatedDeadline.setDate(updatedDeadline.getDate() + updates.pushDeadlineBy.days);
              }
              if (updates.pushDeadlineBy.weeks !== undefined) {
                updatedDeadline.setDate(
                  updatedDeadline.getDate() + updates.pushDeadlineBy.weeks * 7
                );
              }
              if (updates.pushDeadlineBy.months !== undefined) {
                updatedDeadline.setMonth(
                  updatedDeadline.getMonth() + updates.pushDeadlineBy.months
                );
              }

              updated.deadline = updatedDeadline.toISOString().split('T')[0];
            } else if (updates.deadline !== undefined) {
              // Gérer deadline absolue (ou null pour suppression)
              updated.deadline = updates.deadline;
            }
            if (updates.collab !== undefined) {
              updated.collab = updates.collab;
            }
            if (updates.style !== undefined) {
              updated.style = updates.style;
            }
            if (updates.label !== undefined) {
              updated.label = updates.label;
            }
            if (updates.labelFinal !== undefined) {
              updated.labelFinal = updates.labelFinal;
            }
            updated.updatedAt = new Date().toISOString();
            return updated;
          }
          return project;
        })
      );

      // Si une note a été ajoutée, recharger les projets depuis le serveur
      // car la note est complexe (template, tâches extraites, etc.) et difficile à mettre à jour localement
      if (updates.note) {
        // Attendre un peu pour s'assurer que le cache est invalidé côté serveur
        setTimeout(() => {
          fetchProjects();
        }, 100);
      }

      // Rafraîchir les compteurs
      fetchCounts();

      // Déclencher l'animation pour le premier projet modifié (pas de scroll)
      if (projectIds.length > 0) {
        setLastUpdatedProjectId(projectIds[0]);
        // Réinitialiser après l'animation (2 secondes)
        setTimeout(() => {
          setLastUpdatedProjectId(null);
        }, 2000);
      }

      // Désactiver l'animation dorée si elle était active
      setHighlightedFromNotification(null);
    };

    window.addEventListener(
      'projectsUpdatedFromAssistant',
      handleProjectsUpdatedFromAssistant as EventListener
    );

    return () => {
      window.removeEventListener(
        'projectsUpdatedFromAssistant',
        handleProjectsUpdatedFromAssistant as EventListener
      );
    };
  }, [fetchCounts, fetchProjects]);
}
