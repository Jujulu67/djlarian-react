'use client';

/**
 * Composant pour l'affichage riche des résultats de projets
 */
import type { ReactNode } from 'react';

import type { Project } from '@/components/projects/types';
import { SimpleTooltip } from './SimpleTooltip';

interface ProjectResultsViewProps {
  projects: Project[];
  fieldsToShow: string[];
}

// Largeurs fixes pour l'alignement type tableau
const getColWidth = (field: string) => {
  switch (field) {
    case 'releaseDate':
      return 'w-[85px]';
    case 'deadline':
      return 'w-[85px]';
    case 'progress':
      return 'w-[45px]';
    case 'collab':
      return 'w-[100px]';
    case 'style':
      return 'w-[80px]';
    case 'status':
      return 'w-[70px]';
    default:
      return 'w-auto';
  }
};

// Couleurs de statut (fond de la barre de progression et bordure gauche)
function getStatusStyle(status: Project['status']): { bg: string; border: string } {
  switch (status) {
    case 'TERMINE':
      return { bg: 'bg-green-500', border: 'border-l-green-500' };
    case 'EN_COURS':
      return { bg: 'bg-blue-500', border: 'border-l-blue-500' };
    case 'ANNULE':
      return { bg: 'bg-red-500', border: 'border-l-red-500' };
    case 'GHOST_PRODUCTION':
      return { bg: 'bg-purple-500', border: 'border-l-purple-500' };
    default:
      return { bg: 'bg-slate-500', border: 'border-l-slate-500' };
  }
}

const EMPTY_CELL = <span className="text-slate-600">-</span>;

// Rendu du contenu d'une cellule
function renderProjectCell(field: string, project: Project): ReactNode {
  switch (field) {
    case 'releaseDate':
      if (!project.releaseDate) return EMPTY_CELL;
      return (
        <SimpleTooltip content={`Sortie : ${new Date(project.releaseDate).toLocaleDateString()}`}>
          <div className="flex items-center gap-1 text-purple-300 cursor-default">
            <span>🚀</span>
            <span className="truncate">
              {new Date(project.releaseDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </span>
          </div>
        </SimpleTooltip>
      );
    case 'deadline':
      if (!project.deadline) return EMPTY_CELL;
      return (
        <SimpleTooltip content={`Deadline : ${new Date(project.deadline).toLocaleDateString()}`}>
          <div className="flex items-center gap-1 text-orange-300 cursor-default">
            <span>📅</span>
            <span className="truncate">
              {new Date(project.deadline).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </span>
          </div>
        </SimpleTooltip>
      );
    case 'progress':
      if (project.progress === null || project.progress === undefined) return EMPTY_CELL;
      return (
        <SimpleTooltip content={`${project.progress}% complété`}>
          <div className="font-mono font-medium text-slate-300 bg-black/20 px-1 py-0.5 rounded text-center w-full cursor-default">
            {project.progress}%
          </div>
        </SimpleTooltip>
      );
    case 'collab':
      if (!project.collab) return EMPTY_CELL;
      return (
        <SimpleTooltip content={`Collab : ${project.collab}`}>
          <div className="flex items-center gap-1 text-blue-300 truncate cursor-default">
            <span>🤝</span>
            <span className="truncate">{project.collab}</span>
          </div>
        </SimpleTooltip>
      );
    case 'style':
      if (!project.style) return EMPTY_CELL;
      return (
        <SimpleTooltip content={`Style : ${project.style}`}>
          <div className="text-pink-300 truncate px-1 cursor-default">{project.style}</div>
        </SimpleTooltip>
      );
    case 'status':
      if (!project.status) return EMPTY_CELL;
      return (
        <SimpleTooltip content={project.status}>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate cursor-default">
            {project.status === 'TERMINE' ? 'Fini' : project.status.replace('_', ' ')}
          </span>
        </SimpleTooltip>
      );
    default:
      return null;
  }
}

export function ProjectResultsView({ projects, fieldsToShow }: Readonly<ProjectResultsViewProps>) {
  if (!projects.length) return null;

  // Mode ultra-compact si on affiche beaucoup de projets (plus de 5)
  const isCompact = projects.length > 5;

  // Champs à afficher (garantir un fallback)
  const columns = fieldsToShow.length > 0 ? fieldsToShow : ['progress'];

  return (
    <div className={`mt-3 w-full ${isCompact ? 'grid grid-cols-1 gap-1.5' : 'space-y-2'}`}>
      {projects.slice(0, 50).map((project) => {
        const { bg: statusColor, border: statusBorder } = getStatusStyle(project.status);

        return (
          <div
            key={project.id}
            className={`
              group relative rounded-md bg-white/5 border border-white/10 border-l-[3px]
              ${statusBorder}
              hover:bg-white/10 transition-all duration-200
              ${isCompact ? 'py-2 px-3' : 'p-3'}
            `}
          >
            {/* Barre de progression subtile en fond (bas de carte) */}
            {(project.progress || 0) > 0 && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-white/10 w-full rounded-b-md overflow-hidden">
                <div
                  className={`h-full ${statusColor} opacity-50`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 relative z-10">
              {/* Nom */}
              <div className="flex items-center gap-2 min-w-[200px] flex-1">
                <SimpleTooltip content={project.name}>
                  <span className="font-medium text-white text-xs truncate group-hover:text-purple-200 transition-colors cursor-default">
                    {project.name}
                  </span>
                </SimpleTooltip>
              </div>

              {/* Colonnes alignées */}
              <div className="flex items-center gap-2 text-[10px] sm:text-xs shrink-0">
                {columns.map((field) => (
                  <div
                    key={field}
                    className={`${getColWidth(field)} flex items-center justify-center sm:justify-start px-1`}
                  >
                    {renderProjectCell(field, project)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {projects.length > 50 && (
        <p className="text-[10px] text-center text-slate-500 italic mt-1">
          + {projects.length - 50} autres...
        </p>
      )}
    </div>
  );
}
