'use client';

import { EditableCell } from '../EditableCell';
import { ColumnConfig, getCellValue } from './utils';
import { Project } from '../types';

interface ProjectRowCellsProps {
  columns: ColumnConfig[];
  handleUpdate: (projectId: string, field: string, value: string | number | null) => Promise<void>;
  isCompact: boolean;
  project: Project;
}

export function ProjectRowCells({
  columns,
  handleUpdate,
  isCompact,
  project,
}: ProjectRowCellsProps) {
  return (
    <>
      {columns.map((col) => {
        // Permettre le wrap pour les colonnes texte (sauf dates et nombres)
        // Le wrap se fait uniquement entre les mots, pas au milieu d'un mot
        const textColumns = ['name', 'collab', 'label', 'labelFinal', 'style'];
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
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                isCompact={isCompact}
              />
            ) : col.key === 'progress' && project.status === 'TERMINE' ? (
              <EditableCell
                value={100}
                field="progress"
                type="progress"
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="-"
                allowWrap={allowWrap}
                isCompact={isCompact}
                disabled={true}
              />
            ) : (
              <EditableCell
                value={getCellValue(project, col.key)}
                field={col.key}
                type={col.type}
                onSave={(field, value) => handleUpdate(project.id, field, value)}
                placeholder="-"
                allowWrap={allowWrap}
                isCompact={isCompact}
              />
            )}
          </td>
        );
      })}
    </>
  );
}
