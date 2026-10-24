'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { ColumnConfig, SortDirection, SortField } from './utils';

interface ProjectTableHeadProps {
  columns: ColumnConfig[];
  isAdmin: boolean;
  isCompact: boolean;
  onSort: ((field: SortField) => void) | undefined;
  sortDirection: SortDirection;
  sortField: SortField;
}

export function ProjectTableHead({
  columns,
  isAdmin,
  isCompact,
  onSort,
  sortDirection,
  sortField,
}: ProjectTableHeadProps) {
  return (
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
  );
}
