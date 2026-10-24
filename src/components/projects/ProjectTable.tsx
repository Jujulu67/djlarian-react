'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Music2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';

import { LinkEditModal } from './project-table/LinkEditModal';
import { NoteEditModal } from './project-table/NoteEditModal';
import { ProjectMobileCard } from './project-table/ProjectMobileCard';
import { ProjectRowActions } from './project-table/ProjectRowActions';
import { ProjectRowCells } from './project-table/ProjectRowCells';
import { ProjectTableHead } from './project-table/ProjectTableHead';
import { ProjectTableToolbar } from './project-table/ProjectTableToolbar';
import { Project, ProjectStatus } from './types';
import {
  ColumnConfig,
  SortDirection,
  SortField,
  columnsCompact,
  columnsNormal,
} from './project-table/utils';

interface ProjectTableProps {
  projects: Project[];
  onUpdate: (id: string, field: string, value: string | number | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  onReorder?: (projects: Project[]) => Promise<void>;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  onRefresh?: () => void;
  onStatistics?: () => void;
  onImport?: () => void;
  onImportStreams?: () => void;
  onExport?: () => void;
  onPurge?: () => void;
  isLoading?: boolean;
  projectsCount?: number;
  highlightedProjectId?: string | null;
  persistentHighlight?: boolean; // Si true, l'animation ne s'arrête pas (pour notifications)
  isAdmin?: boolean;
  showStats?: boolean; // Afficher/masquer les colonnes de stats
  defaultStatus?: ProjectStatus | 'ALL';
}

export const ProjectTable = ({
  projects,
  onUpdate,
  onDelete,
  onCreate,
  onReorder,
  sortField = null,
  sortDirection = 'asc',
  onSort,
  onRefresh,
  onStatistics,
  onImport,
  onImportStreams,
  onExport,
  onPurge,
  isLoading = false,
  projectsCount = 0,
  highlightedProjectId = null,
  persistentHighlight = false,
  isAdmin = false,
  showStats = false,
  defaultStatus = 'ALL',
}: ProjectTableProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState<string>('');
  const [isCompact, setIsCompact] = useState(false);
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Détecter automatiquement si on doit passer en mode compact basé sur window.innerWidth
  // Breakpoints: >= 1280px = normal, < 1280px = compact, <= 768px = mobile (cartes)
  useEffect(() => {
    const checkWindowWidth = () => {
      if (isMobile) return; // Mobile géré par useIsMobile

      const width = window.innerWidth;
      // Mode compact pour tablettes et écrans moyens (769px - 1279px)
      setIsCompact(width < 1280);
    };

    checkWindowWidth();
    window.addEventListener('resize', checkWindowWidth);
    return () => window.removeEventListener('resize', checkWindowWidth);
  }, [isMobile]);

  // Toggle streams section for mobile cards
  const toggleStreams = (projectId: string) => {
    setExpandedStreams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Filtrer les colonnes selon showStats
  const getFilteredColumns = (cols: ColumnConfig[]): ColumnConfig[] => {
    if (showStats) {
      // En mode stats: garder seulement nom, stats, et actions (pas de colonne actions dans la config, géré séparément)
      return cols.filter((col) => col.key === 'name' || col.key.startsWith('streams'));
    }
    // Masquer les colonnes de stats si showStats est false
    return cols.filter((col) => !col.key.startsWith('streams'));
  };

  const columns = getFilteredColumns(isCompact ? columnsCompact : columnsNormal);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    const reorderedProjects = Array.from(projects);
    const [removed] = reorderedProjects.splice(sourceIndex, 1);
    reorderedProjects.splice(destinationIndex, 0, removed);

    onReorder(reorderedProjects);
  };

  const handleUpdate = useCallback(
    async (projectId: string, field: string, value: string | number | null) => {
      await onUpdate(projectId, field, value);
    },
    [onUpdate]
  );

  const handleSaveLink = async () => {
    if (!editingLinkId) return;

    try {
      await onUpdate(editingLinkId, 'externalLink', linkValue || null);
      setEditingLinkId(null);
      setLinkValue('');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du lien:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNoteId) return;

    try {
      await onUpdate(editingNoteId, 'note', noteValue || null);
      setEditingNoteId(null);
      setNoteValue('');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    if (!confirm('Supprimer ce projet ?')) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ligne d'ajout et boutons d'action */}
      <ProjectTableToolbar
        defaultStatus={defaultStatus}
        isAdding={isAdding}
        isLoading={isLoading}
        onCreate={onCreate}
        onExport={onExport}
        onImport={onImport}
        onImportStreams={onImportStreams}
        onPurge={onPurge}
        onRefresh={onRefresh}
        onStatistics={onStatistics}
        projectsCount={projectsCount}
        setIsAdding={setIsAdding}
      />

      {/* Mode mobile : Cartes redesignées */}
      {isMobile ? (
        <div className="space-y-10">
          {projects.length === 0 ? (
            <div className="glass-modern rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Music2 size={32} className="text-purple-400" />
              </div>
              <p className="text-lg mb-2 text-gray-300 font-medium">Aucun projet</p>
              <p className="text-sm text-gray-500">
                Clique sur &ldquo;Ajouter un projet&rdquo; pour commencer
              </p>
            </div>
          ) : (
            projects.map((project) => {
              return (
                <ProjectMobileCard
                  key={project.id}
                  deletingId={deletingId}
                  handleDelete={handleDelete}
                  handleUpdate={handleUpdate}
                  onUpdate={onUpdate}
                  project={project}
                  setEditingLinkId={setEditingLinkId}
                  setEditingNoteId={setEditingNoteId}
                  setLinkValue={setLinkValue}
                  setNoteValue={setNoteValue}
                  showStats={showStats}
                  toggleStreams={toggleStreams}
                  highlightedProjectId={highlightedProjectId}
                  persistentHighlight={persistentHighlight}
                  expandedStreams={expandedStreams}
                />
              );
            })
          )}
        </div>
      ) : (
        /* Tableau desktop */
        <div className="glass-modern rounded-xl overflow-hidden" ref={tableRef}>
          <div className="overflow-x-hidden">
            <table
              className="w-full table-fixed"
              role="table"
              aria-label="Tableau des projets musicaux"
            >
              <ProjectTableHead
                columns={columns}
                isAdmin={isAdmin}
                isCompact={isCompact}
                onSort={onSort}
                sortDirection={sortDirection}
                sortField={sortField}
              />
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="projects-table">
                  {(provided) => (
                    <tbody
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="divide-y divide-white/5"
                    >
                      {projects.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length + (isAdmin ? 2 : 1) + 1}
                            className="px-4 py-12 text-center text-gray-400"
                          >
                            <p className="text-lg mb-2">Aucun projet</p>
                            <p className="text-sm">
                              Clique sur &ldquo;Ajouter un projet&rdquo; pour commencer
                            </p>
                          </td>
                        </tr>
                      ) : (
                        projects.map((project, index) => {
                          const isHighlighted = highlightedProjectId === project.id;
                          const isPersistentGold = isHighlighted && persistentHighlight;
                          return (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <tr
                                  id={`project-${project.id}`}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  data-project-id={project.id}
                                  className={`group hover:bg-white/5 transition-colors ${
                                    snapshot.isDragging ? 'bg-purple-500/20' : ''
                                  } ${
                                    isPersistentGold
                                      ? 'animate-highlight-gold'
                                      : isHighlighted
                                        ? 'animate-highlight-purple'
                                        : ''
                                  }`}
                                >
                                  {/* Poignée de drag */}
                                  <td className={`${isCompact ? 'w-6 px-0.5' : 'w-10 px-2'} py-2`}>
                                    <div
                                      {...provided.dragHandleProps}
                                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                                        snapshot.isDragging
                                          ? 'opacity-100 cursor-grabbing'
                                          : 'cursor-grab'
                                      }`}
                                    >
                                      <GripVertical
                                        size={isCompact ? 10 : 16}
                                        className={
                                          snapshot.isDragging ? 'text-purple-400' : 'text-gray-500'
                                        }
                                      />
                                    </div>
                                  </td>

                                  {/* Colonne utilisateur pour admin */}
                                  {isAdmin && (
                                    <td
                                      className={`${isCompact ? 'px-0.5 py-0.5' : 'px-3 py-2'}`}
                                      style={isCompact ? { minWidth: '50px', width: '55px' } : {}}
                                    >
                                      <span
                                        className={`${isCompact ? 'text-[9px]' : 'text-sm'} text-gray-300 truncate block`}
                                      >
                                        {project.User?.name || project.User?.email || 'N/A'}
                                      </span>
                                    </td>
                                  )}

                                  {/* Colonnes éditables */}
                                  <ProjectRowCells
                                    columns={columns}
                                    handleUpdate={handleUpdate}
                                    isCompact={isCompact}
                                    project={project}
                                  />

                                  {/* Colonne Action */}
                                  <ProjectRowActions
                                    deletingId={deletingId}
                                    handleDelete={handleDelete}
                                    isCompact={isCompact}
                                    project={project}
                                    setEditingLinkId={setEditingLinkId}
                                    setEditingNoteId={setEditingNoteId}
                                    setLinkValue={setLinkValue}
                                    setNoteValue={setNoteValue}
                                  />
                                </tr>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </DragDropContext>
            </table>
          </div>
        </div>
      )}

      {/* Modale pour éditer le lien */}
      {editingLinkId && (
        <LinkEditModal
          handleSaveLink={handleSaveLink}
          linkValue={linkValue}
          setEditingLinkId={setEditingLinkId}
          setLinkValue={setLinkValue}
        />
      )}

      {/* Modale pour éditer la note */}
      {editingNoteId && (
        <NoteEditModal
          editingNoteId={editingNoteId}
          handleSaveNote={handleSaveNote}
          noteValue={noteValue}
          projects={projects}
          setEditingNoteId={setEditingNoteId}
          setNoteValue={setNoteValue}
        />
      )}
    </div>
  );
};
