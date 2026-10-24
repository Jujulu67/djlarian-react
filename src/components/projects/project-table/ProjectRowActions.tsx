'use client';

import { ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { Project } from '../types';

interface ProjectRowActionsProps {
  deletingId: string | null;
  handleDelete: (id: string) => Promise<void>;
  isCompact: boolean;
  project: Project;
  setEditingLinkId: Dispatch<SetStateAction<string | null>>;
  setEditingNoteId: Dispatch<SetStateAction<string | null>>;
  setLinkValue: Dispatch<SetStateAction<string>>;
  setNoteValue: Dispatch<SetStateAction<string>>;
}

export function ProjectRowActions({
  deletingId,
  handleDelete,
  isCompact,
  project,
  setEditingLinkId,
  setEditingNoteId,
  setLinkValue,
  setNoteValue,
}: ProjectRowActionsProps) {
  return (
    <td
      className={`${isCompact ? 'px-0.5 py-0.5' : 'px-3 py-2'} border-l-2 border-gray-700/50`}
      style={{
        minWidth: isCompact ? '50px' : '70px',
        width: isCompact ? '55px' : '80px',
        maxWidth: isCompact ? '55px' : '80px',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative group/link">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (project.externalLink) {
                // Si lien présent, ouvrir directement
                window.open(project.externalLink, '_blank', 'noopener,noreferrer');
              } else {
                // Sinon, ouvrir la modale pour ajouter un lien
                setEditingLinkId(project.id);
                setLinkValue('');
              }
            }}
            className={`${isCompact ? 'p-0.5' : 'p-1.5'} rounded transition-all ${
              project.externalLink
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
            }`}
            title={
              project.externalLink
                ? `Clic: Ouvrir le lien\n${project.externalLink}`
                : 'Ajouter un lien'
            }
            aria-label={
              project.externalLink
                ? `Ouvrir le lien externe pour ${project.name}`
                : `Ajouter un lien pour ${project.name}`
            }
          >
            <ExternalLink size={isCompact ? 10 : 16} aria-hidden="true" />
          </button>
          {project.externalLink && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingLinkId(project.id);
                setLinkValue(project.externalLink || '');
              }}
              className="absolute -top-1 -right-1 p-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full opacity-0 group-hover/link:opacity-100 transition-opacity shadow-lg z-10"
              title="Modifier le lien"
              aria-label={`Modifier le lien pour ${project.name}`}
            >
              <Pencil size={isCompact ? 7 : 10} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingNoteId(project.id);
            setNoteValue(project.note || '');
          }}
          className={`${isCompact ? 'p-0.5' : 'p-1.5'} rounded transition-all ${
            project.note
              ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
          }`}
          title={
            project.note
              ? `Note: ${project.note.substring(0, 50)}${project.note.length > 50 ? '...' : ''}`
              : 'Ajouter une note'
          }
          aria-label={
            project.note
              ? `Voir/modifier la note pour ${project.name}`
              : `Ajouter une note pour ${project.name}`
          }
        >
          <FileText size={isCompact ? 10 : 16} aria-hidden="true" />
        </button>
        <button
          onClick={() => handleDelete(project.id)}
          disabled={deletingId === project.id}
          className={`${isCompact ? 'p-0.5' : 'p-1.5'} text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all disabled:opacity-50`}
          title="Supprimer le projet"
          aria-label={`Supprimer le projet ${project.name}`}
        >
          <Trash2 size={isCompact ? 10 : 16} aria-hidden="true" />
        </button>
      </div>
    </td>
  );
}
