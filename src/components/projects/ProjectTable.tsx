'use client';

import { Trash2, GripVertical } from 'lucide-react';
import { useState, useCallback } from 'react';

import { AddProjectRow } from './AddProjectRow';
import { EditableCell } from './EditableCell';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Project, ProjectStatus, CellType } from './types';

interface ProjectTableProps {
  projects: Project[];
  onUpdate: (id: string, field: string, value: string | number | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  isAdmin?: boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  type: CellType;
  width?: string;
  minWidth?: string;
  hideOnMobile?: boolean;
}

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nom Projet', type: 'text', minWidth: '150px' },
  { key: 'style', label: 'Style', type: 'text', minWidth: '100px' },
  { key: 'status', label: 'Statut', type: 'select', minWidth: '100px' },
  { key: 'collab', label: 'Collab', type: 'text', minWidth: '100px' },
  { key: 'label', label: 'Label', type: 'text', minWidth: '100px' },
  { key: 'labelFinal', label: 'Label Final', type: 'text', minWidth: '100px' },
  { key: 'releaseDate', label: 'Date Sortie', type: 'date', minWidth: '130px' },
  { key: 'externalLink', label: 'Lien', type: 'link', minWidth: '80px' },
  { key: 'streamsJ7', label: 'J7', type: 'number', width: '70px', hideOnMobile: true },
  { key: 'streamsJ14', label: 'J14', type: 'number', width: '70px', hideOnMobile: true },
  { key: 'streamsJ21', label: 'J21', type: 'number', width: '70px', hideOnMobile: true },
  { key: 'streamsJ28', label: 'J28', type: 'number', width: '70px', hideOnMobile: true },
  { key: 'streamsJ56', label: 'J56', type: 'number', width: '70px', hideOnMobile: true },
  { key: 'streamsJ84', label: 'J84', type: 'number', width: '70px', hideOnMobile: true },
];

export const ProjectTable = ({
  projects,
  onUpdate,
  onDelete,
  onCreate,
  isAdmin = false,
}: ProjectTableProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpdate = useCallback(
    async (projectId: string, field: string, value: string | number | null) => {
      await onUpdate(projectId, field, value);
    },
    [onUpdate]
  );

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
      {/* Tableau avec scroll horizontal */}
      <div className="glass-modern rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[1200px]"
            role="table"
            aria-label="Tableau des projets musicaux"
          >
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-10 px-2 py-3 text-left">
                  <span className="sr-only">Actions</span>
                </th>
                {isAdmin && (
                  <th className="px-3 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Utilisateur
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider whitespace-nowrap ${
                      col.hideOnMobile ? 'hidden lg:table-cell' : ''
                    }`}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-12 px-2 py-3">
                  <span className="sr-only">Supprimer</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (isAdmin ? 3 : 2)}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <p className="text-lg mb-2">Aucun projet</p>
                    <p className="text-sm">
                      Clique sur &ldquo;Ajouter un projet&rdquo; pour commencer
                    </p>
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                    {/* Poignée de drag (visuel seulement pour l'instant) */}
                    <td className="w-10 px-2 py-2">
                      <div className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab">
                        <GripVertical size={16} className="text-gray-500" />
                      </div>
                    </td>

                    {/* Colonne utilisateur pour admin */}
                    {isAdmin && (
                      <td className="px-3 py-2">
                        <span className="text-sm text-gray-300">
                          {project.User?.name || project.User?.email || 'N/A'}
                        </span>
                      </td>
                    )}

                    {/* Colonnes éditables */}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-1 py-2 ${col.hideOnMobile ? 'hidden lg:table-cell' : ''}`}
                        style={{
                          width: col.width,
                          minWidth: col.minWidth,
                        }}
                      >
                        {col.key === 'status' ? (
                          <div className="flex items-center gap-2">
                            <ProjectStatusBadge status={project.status} />
                            <EditableCell
                              value={project.status}
                              field="status"
                              type="select"
                              onSave={(field, value) => handleUpdate(project.id, field, value)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        ) : (
                          <EditableCell
                            value={getCellValue(project, col.key)}
                            field={col.key}
                            type={col.type}
                            onSave={(field, value) => handleUpdate(project.id, field, value)}
                            placeholder="-"
                          />
                        )}
                      </td>
                    ))}

                    {/* Bouton supprimer */}
                    <td className="w-12 px-2 py-2">
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={deletingId === project.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all disabled:opacity-50"
                        title="Supprimer le projet"
                        aria-label={`Supprimer le projet ${project.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ligne d'ajout */}
      <AddProjectRow onAdd={onCreate} isAdding={isAdding} setIsAdding={setIsAdding} />
    </div>
  );
};
