'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Trash2,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Upload,
  Download,
  ExternalLink,
  Pencil,
  ChevronDown,
  Calendar,
  Music2,
  BarChart3,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';

import { AddProjectRow } from './AddProjectRow';
import { EditableCell } from './EditableCell';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Project, ProjectStatus, CellType, PROJECT_STATUSES } from './types';

type SortField = keyof Project | null;
type SortDirection = 'asc' | 'desc';

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
}

interface ColumnConfig {
  key: string;
  label: string;
  type: CellType;
  width?: string;
  minWidth?: string;
  hideOnMobile?: boolean;
}

// Configuration des colonnes en mode normal (large écran >= 1280px)
// Largeurs fixes pour éviter les débordements
const columnsNormal: ColumnConfig[] = [
  { key: 'name', label: 'Nom Projet', type: 'text', width: '180px', minWidth: '120px' },
  { key: 'style', label: 'Style', type: 'text', width: '100px', minWidth: '80px' },
  { key: 'status', label: 'Statut', type: 'select', width: '110px', minWidth: '100px' },
  { key: 'collab', label: 'Collab', type: 'text', width: '120px', minWidth: '80px' },
  { key: 'label', label: 'Label', type: 'select', width: '100px', minWidth: '80px' },
  { key: 'labelFinal', label: 'Label Final', type: 'text', width: '110px', minWidth: '80px' },
  { key: 'releaseDate', label: 'Date Sortie', type: 'date', width: '110px', minWidth: '100px' },
  { key: 'streamsJ7', label: 'J7', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ14', label: 'J14', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ21', label: 'J21', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ28', label: 'J28', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ56', label: 'J56', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ84', label: 'J84', type: 'number', width: '65px', minWidth: '55px' },
  { key: 'streamsJ180', label: 'J180', type: 'number', width: '70px', minWidth: '60px' },
  { key: 'streamsJ365', label: 'J365', type: 'number', width: '70px', minWidth: '60px' },
];

// Configuration des colonnes en mode compact (écran moyen)
const columnsCompact: ColumnConfig[] = [
  { key: 'name', label: 'Nom', type: 'text', minWidth: '60px', width: '80px' },
  { key: 'style', label: 'Style', type: 'text', minWidth: '45px', width: '55px' },
  { key: 'status', label: 'Statut', type: 'select', minWidth: '60px', width: '70px' },
  { key: 'collab', label: 'Collab', type: 'text', minWidth: '50px', width: '60px' },
  { key: 'label', label: 'Label', type: 'select', minWidth: '45px', width: '55px' },
  { key: 'labelFinal', label: 'Label F', type: 'text', minWidth: '45px', width: '55px' },
  { key: 'releaseDate', label: 'Date', type: 'date', minWidth: '55px', width: '65px' },
  { key: 'streamsJ7', label: 'J7', type: 'number', width: '40px', minWidth: '40px' },
  { key: 'streamsJ14', label: 'J14', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ21', label: 'J21', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ28', label: 'J28', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ56', label: 'J56', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ84', label: 'J84', type: 'number', width: '42px', minWidth: '42px' },
  { key: 'streamsJ180', label: 'J180', type: 'number', width: '45px', minWidth: '45px' },
  { key: 'streamsJ365', label: 'J365', type: 'number', width: '45px', minWidth: '45px' },
];

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
}: ProjectTableProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState<string>('');
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

  // Helper pour obtenir la couleur de bordure selon le statut
  const getStatusBorderColor = (status: ProjectStatus): string => {
    const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
    const colorMap: Record<string, string> = {
      blue: 'border-l-blue-500',
      green: 'border-l-emerald-500',
      red: 'border-l-red-500',
      orange: 'border-l-amber-500',
      purple: 'border-l-purple-500',
    };
    return colorMap[statusConfig?.color || 'blue'] || 'border-l-blue-500';
  };

  // Helper pour obtenir le total des streams
  const getTotalStreams = (project: Project): number => {
    return (
      (project.streamsJ7 || 0) +
      (project.streamsJ14 || 0) +
      (project.streamsJ21 || 0) +
      (project.streamsJ28 || 0) +
      (project.streamsJ56 || 0) +
      (project.streamsJ84 || 0) +
      (project.streamsJ180 || 0) +
      (project.streamsJ365 || 0)
    );
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

  const getCellValue = (project: Project, key: string): string | number | null => {
    return project[key as keyof Project] as string | number | null;
  };

  return (
    <div className="space-y-4">
      {/* Ligne d'ajout et boutons d'action */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <AddProjectRow onAdd={onCreate} isAdding={isAdding} setIsAdding={setIsAdding} />
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-2 h-[38px] text-gray-400 hover:text-white hover:bg-white/10 rounded-lg border border-gray-700/70 hover:border-gray-500/70 transition-all disabled:opacity-50 flex items-center justify-center"
              title="Rafraîchir"
              aria-label="Rafraîchir la liste des projets"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          )}
          {onStatistics && (
            <button
              onClick={onStatistics}
              className="px-3 py-2 h-[38px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Voir les statistiques"
              aria-label="Voir les statistiques des projets"
            >
              <BarChart3 size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Statistiques</span>
            </button>
          )}
          {onImport && (
            <button
              onClick={onImport}
              className="px-3 py-2 h-[38px] bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Importer depuis Excel ou CSV"
              aria-label="Importer des projets depuis Excel ou CSV"
            >
              <Upload size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Importer Excel/CSV</span>
            </button>
          )}
          {onImportStreams && (
            <button
              onClick={onImportStreams}
              className="px-3 py-2 h-[38px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Importer des streams depuis CSV"
              aria-label="Importer des streams depuis CSV"
            >
              <Upload size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Importer Streams CSV</span>
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-2 h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Exporter vers Excel"
              aria-label="Exporter les projets vers Excel"
            >
              <Download size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Exporter Excel</span>
            </button>
          )}
          {onPurge && (
            <button
              onClick={onPurge}
              disabled={isLoading || projectsCount === 0}
              className="px-4 py-2 h-[38px] bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              title="Supprimer tous les projets"
              aria-label="Purger tous les projets"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Purger</span>
            </button>
          )}
        </div>
      </div>

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
                            title={
                              project.externalLink
                                ? `Ouvrir: ${project.externalLink}`
                                : 'Ajouter un lien'
                            }
                            aria-label={
                              project.externalLink ? 'Ouvrir le lien externe' : 'Ajouter un lien'
                            }
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
            })
          )}
        </div>
      ) : (
        /* Tableau desktop */
        <div className="glass-modern rounded-xl overflow-hidden" ref={tableRef}>
          <div className="overflow-x-auto scrollbar-thin">
            <table
              className="w-full"
              role="table"
              aria-label="Tableau des projets musicaux"
              style={{ minWidth: isCompact ? '900px' : '1200px' }}
            >
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${isCompact ? 'w-6 px-0.5' : 'w-10 px-2'} py-2 text-left`}>
                    <span className="sr-only">Actions</span>
                  </th>
                  {isAdmin && (
                    <th
                      className={`${isCompact ? 'px-0.5 text-[9px]' : 'px-3 text-xs'} py-2 text-left font-semibold text-purple-300 uppercase tracking-wider`}
                      style={isCompact ? { minWidth: '50px', width: '55px' } : {}}
                    >
                      {isCompact ? 'User' : 'Utilisateur'}
                    </th>
                  )}
                  {columns.map((col) => {
                    const isSorted = sortField === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`${isCompact ? 'px-0.5 py-0.5 text-[9px]' : 'px-3 py-2 text-xs'} text-left font-semibold text-purple-300 uppercase tracking-wider whitespace-nowrap ${
                          onSort ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''
                        }`}
                        style={{
                          width: col.width,
                          minWidth: col.minWidth,
                          maxWidth: col.width,
                        }}
                        onClick={() => onSort?.(col.key as SortField)}
                        title={onSort ? `Trier par ${col.label}` : undefined}
                      >
                        <div className={`flex items-center gap-1 ${isCompact ? 'px-1' : 'px-2'}`}>
                          <span>{col.label}</span>
                          {onSort && (
                            <span className="text-purple-400 flex-shrink-0">
                              {isSorted ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp size={isCompact ? 9 : 14} />
                                ) : (
                                  <ArrowDown size={isCompact ? 9 : 14} />
                                )
                              ) : (
                                <ArrowUpDown size={isCompact ? 9 : 14} className="opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th
                    className={`${isCompact ? 'px-0.5 py-0.5 text-[9px]' : 'px-3 py-2 text-xs'} text-left font-semibold text-purple-300 uppercase tracking-wider whitespace-nowrap border-l-2 border-gray-700/50`}
                    style={{
                      minWidth: isCompact ? '50px' : '70px',
                      width: isCompact ? '55px' : '80px',
                      maxWidth: isCompact ? '55px' : '80px',
                    }}
                  >
                    <span>Action</span>
                  </th>
                </tr>
              </thead>
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
                                  {columns.map((col) => {
                                    // Permettre le wrap pour les colonnes texte (sauf dates et nombres)
                                    // Le wrap se fait uniquement entre les mots, pas au milieu d'un mot
                                    const textColumns = [
                                      'name',
                                      'collab',
                                      'label',
                                      'labelFinal',
                                      'style',
                                    ];
                                    const allowWrap = textColumns.includes(col.key);
                                    return (
                                      <td
                                        key={col.key}
                                        className={`${isCompact ? 'px-0.5 py-0.5' : 'px-3 py-2'}`}
                                        style={{
                                          width: col.width,
                                          minWidth: col.minWidth,
                                          maxWidth: col.width,
                                        }}
                                      >
                                        {col.key === 'status' ? (
                                          <EditableCell
                                            value={project.status}
                                            field="status"
                                            type="select"
                                            onSave={(field, value) =>
                                              handleUpdate(project.id, field, value)
                                            }
                                            isCompact={isCompact}
                                          />
                                        ) : (
                                          <EditableCell
                                            value={getCellValue(project, col.key)}
                                            field={col.key}
                                            type={col.type}
                                            onSave={(field, value) =>
                                              handleUpdate(project.id, field, value)
                                            }
                                            placeholder="-"
                                            allowWrap={allowWrap}
                                            isCompact={isCompact}
                                          />
                                        )}
                                      </td>
                                    );
                                  })}

                                  {/* Colonne Action */}
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
                                              window.open(
                                                project.externalLink,
                                                '_blank',
                                                'noopener,noreferrer'
                                              );
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
                                          <ExternalLink
                                            size={isCompact ? 10 : 16}
                                            aria-hidden="true"
                                          />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingLinkId(null);
              setLinkValue('');
            }
          }}
        >
          <div className="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] border border-purple-500/30 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Modifier le lien</h3>
            <input
              type="url"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveLink();
                } else if (e.key === 'Escape') {
                  setEditingLinkId(null);
                  setLinkValue('');
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingLinkId(null);
                  setLinkValue('');
                }}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveLink}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
