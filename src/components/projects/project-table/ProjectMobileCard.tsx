'use client';

import { Calendar, ChevronDown, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { EditableCell } from '../EditableCell';
import { getStatusBorderColor, getTotalStreams } from './utils';
import { Project } from '../types';

interface ProjectMobileCardProps {
  deletingId: string | null;
  handleDelete: (id: string) => Promise<void>;
  handleUpdate: (projectId: string, field: string, value: string | number | null) => Promise<void>;
  onUpdate: (id: string, field: string, value: string | number | null) => Promise<void>;
  project: Project;
  setEditingLinkId: Dispatch<SetStateAction<string | null>>;
  setEditingNoteId: Dispatch<SetStateAction<string | null>>;
  setLinkValue: Dispatch<SetStateAction<string>>;
  setNoteValue: Dispatch<SetStateAction<string>>;
  showStats: boolean;
  toggleStreams: (projectId: string) => void;
  highlightedProjectId: string | null;
  persistentHighlight: boolean;
  expandedStreams: Set<string>;
}

export function ProjectMobileCard({
  deletingId,
  handleDelete,
  handleUpdate,
  onUpdate,
  project,
  setEditingLinkId,
  setEditingNoteId,
  setLinkValue,
  setNoteValue,
  showStats,
  toggleStreams,
  highlightedProjectId,
  persistentHighlight,
  expandedStreams,
}: ProjectMobileCardProps) {
  const isHighlighted = highlightedProjectId === project.id;
  const isPersistentGold = isHighlighted && persistentHighlight;
  const isStreamsExpanded = expandedStreams.has(project.id);
  const totalStreams = getTotalStreams(project);
  const hasStreams = totalStreams > 0;

  return (
    <div
      key={project.id}
      id={`project-${project.id}`}
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-gray-800/50
        border border-white/10 
        border-l-4 ${getStatusBorderColor(project.status)}
        shadow-lg shadow-black/20
        transition-all duration-300
        ${
          isPersistentGold
            ? 'animate-highlight-gold'
            : isHighlighted
              ? 'animate-highlight-purple ring-2 ring-purple-500/50'
              : ''
        }
      `}
    >
      {/* Header avec nom et actions */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Nom du projet - proéminent */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-white truncate">
              <EditableCell
                value={project.name}
                field="name"
                type="text"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="Nom du projet"
                className="!text-lg !font-semibold"
              />
            </div>
            {/* Badge statut sous le nom */}
            <div className="mt-2">
              <EditableCell
                value={project.status}
                field="status"
                type="select"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
              />
            </div>
          </div>

          {/* Actions groupées */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative group/link">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (project.externalLink) {
                    window.open(project.externalLink, '_blank', 'noopener,noreferrer');
                  } else {
                    setEditingLinkId(project.id);
                    setLinkValue('');
                  }
                }}
                className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                  project.externalLink
                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                    : 'text-gray-400 bg-gray-500/10 hover:bg-gray-500/20'
                }`}
                title={project.externalLink ? `Ouvrir: ${project.externalLink}` : 'Ajouter un lien'}
                aria-label={project.externalLink ? 'Ouvrir le lien externe' : 'Ajouter un lien'}
              >
                <ExternalLink size={18} aria-hidden="true" />
              </button>
              {project.externalLink && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingLinkId(project.id);
                    setLinkValue(project.externalLink || '');
                  }}
                  className="absolute -top-1 -right-1 p-1 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg z-10 transition-colors"
                  title="Modifier le lien"
                  aria-label="Modifier le lien"
                >
                  <Pencil size={10} aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingNoteId(project.id);
                setNoteValue(project.note || '');
              }}
              className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                project.note
                  ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'text-gray-400 bg-gray-500/10 hover:bg-gray-500/20'
              }`}
              title={
                project.note
                  ? `Note: ${project.note.substring(0, 50)}${project.note.length > 50 ? '...' : ''}`
                  : 'Ajouter une note'
              }
              aria-label={project.note ? 'Voir/modifier la note' : 'Ajouter une note'}
            >
              <FileText size={18} aria-hidden="true" />
            </button>
            <button
              onClick={() => handleDelete(project.id)}
              disabled={deletingId === project.id}
              className="p-2.5 text-gray-400 bg-gray-500/10 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Supprimer le projet"
              aria-label="Supprimer le projet"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Informations principales */}
      {!showStats && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {/* Style */}
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Style
              </label>
              <div className="text-sm text-gray-200">
                <EditableCell
                  value={project.style}
                  field="style"
                  type="text"
                  onSave={(field, value) => handleUpdate(project.id, field, value)}
                  placeholder="-"
                />
              </div>
            </div>

            {/* Collab */}
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Collab
              </label>
              <div className="text-sm text-gray-200">
                <EditableCell
                  value={project.collab}
                  field="collab"
                  type="text"
                  onSave={(field, value) => handleUpdate(project.id, field, value)}
                  placeholder="-"
                />
              </div>
            </div>

            {/* Label */}
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Label
              </label>
              <div className="text-sm text-gray-200">
                <EditableCell
                  value={project.label}
                  field="label"
                  type="select"
                  onSave={(field, value) => handleUpdate(project.id, field, value)}
                  placeholder="-"
                />
              </div>
            </div>

            {/* Label Final */}
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                Label Final
              </label>
              <div className="text-sm text-gray-200">
                <EditableCell
                  value={project.labelFinal}
                  field="labelFinal"
                  type="text"
                  onSave={(field, value) => handleUpdate(project.id, field, value)}
                  placeholder="-"
                />
              </div>
            </div>
          </div>

          {/* Date de sortie - mise en avant */}
          {project.releaseDate && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-purple-400" />
              <span className="text-gray-400">Sortie:</span>
              <EditableCell
                value={project.releaseDate}
                field="releaseDate"
                type="date"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="-"
                className="!text-purple-300 !font-medium"
              />
            </div>
          )}
          {!project.releaseDate && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-gray-500">Date:</span>
              <EditableCell
                value={project.releaseDate}
                field="releaseDate"
                type="date"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="Non définie"
              />
            </div>
          )}
          {/* Deadline */}
          {project.deadline && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-orange-400" />
              <span className="text-gray-400">Deadline:</span>
              <EditableCell
                value={project.deadline}
                field="deadline"
                type="date"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="-"
                className="!text-orange-300 !font-medium"
              />
            </div>
          )}
          {!project.deadline && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-gray-500">Deadline:</span>
              <EditableCell
                value={project.deadline}
                field="deadline"
                type="date"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="-"
              />
            </div>
          )}
        </div>
      )}

      {/* Section Streams - Collapsible */}
      {showStats && (
        <div
          className={isStreamsExpanded ? '' : 'border-t border-white/5'}
          style={isStreamsExpanded ? { borderTop: 'none' } : {}}
        >
          <button
            onClick={() => toggleStreams(project.id)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-white/5 transition-colors focus:outline-none"
            aria-expanded={isStreamsExpanded}
            aria-controls={`streams-${project.id}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Streams</span>
              {hasStreams && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300">
                  {totalStreams.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${isStreamsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Contenu streams */}
          {showStats && (
            <div
              id={`streams-${project.id}`}
              className={`
              grid grid-cols-3 gap-3 px-4 overflow-hidden transition-all duration-300 ease-out
              ${isStreamsExpanded ? 'pb-4 pt-0.5 max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
            >
              {/* Jalons court terme */}
              <div className="col-span-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                  Court terme
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'streamsJ7', label: 'J7' },
                    { key: 'streamsJ14', label: 'J14' },
                    { key: 'streamsJ21', label: 'J21' },
                    { key: 'streamsJ28', label: 'J28' },
                    { key: 'streamsJ56', label: 'J56' },
                    { key: 'streamsJ84', label: 'J84' },
                  ].map(({ key, label }) => (
                    <div key={key} className="bg-white/5 rounded-lg p-2 text-center">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">
                        {label}
                      </label>
                      <div className="text-sm font-medium text-gray-200">
                        <EditableCell
                          value={project[key as keyof Project] as number | null}
                          field={key}
                          type="number"
                          onSave={(field, value) => onUpdate(project.id, field, value)}
                          placeholder="0"
                          className="text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jalons long terme */}
              <div className="col-span-3 mt-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                  Long terme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'streamsJ180', label: 'J180 (6 mois)' },
                    { key: 'streamsJ365', label: 'J365 (1 an)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="bg-white/5 rounded-lg p-2 text-center">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">
                        {label}
                      </label>
                      <div className="text-sm font-medium text-gray-200">
                        <EditableCell
                          value={project[key as keyof Project] as number | null}
                          field={key}
                          type="number"
                          onSave={(field, value) => onUpdate(project.id, field, value)}
                          placeholder="0"
                          className="text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
