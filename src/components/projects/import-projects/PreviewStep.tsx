'use client';

import { AlertCircle, Check, Loader2 } from 'lucide-react';

import { Checkbox } from '@/components/ui/Checkbox';
import { ParsedProjectRow } from '@/lib/utils/parseExcelData';

import { PROJECT_STATUSES, ProjectStatus } from '../types';
import type { DialogStep } from './types';

interface PreviewStepProps {
  detectedColumns: Array<{ original: string; mapped: string | null }>;
  duplicatesInfo: { inFile: number; inDb: number; total: number; uniqueCount: number };
  existingProjects: Array<{ name: string; status: string }>;
  handleImport: () => Promise<void>;
  handleUpdateRow: (
    index: number,
    field: keyof ParsedProjectRow,
    value: string | number | Date | null
  ) => void;
  hasHeaders: boolean;
  invalidRowsCount: number;
  isImporting: boolean;
  overwriteDuplicates: boolean;
  parsedRows: ParsedProjectRow[];
  projectsToImportCount: number;
  setOverwriteDuplicates: React.Dispatch<React.SetStateAction<boolean>>;
  setStep: React.Dispatch<React.SetStateAction<DialogStep>>;
  validRowsCount: number;
}

export function PreviewStep({
  detectedColumns,
  duplicatesInfo,
  existingProjects,
  handleImport,
  handleUpdateRow,
  hasHeaders,
  invalidRowsCount,
  isImporting,
  overwriteDuplicates,
  parsedRows,
  projectsToImportCount,
  setOverwriteDuplicates,
  setStep,
  validRowsCount,
}: PreviewStepProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Aperçu des données</h3>
          <p className="text-sm text-gray-400 mt-1">
            {parsedRows.length} ligne(s) détectée(s) •{' '}
            <span className="text-green-400">
              {validRowsCount - duplicatesInfo.total} valide(s)
            </span>
            {duplicatesInfo.total > 0 && (
              <>
                {' '}
                • <span className="text-yellow-400">{duplicatesInfo.total} doublon(s)</span>
                {duplicatesInfo.inFile > 0 && duplicatesInfo.inDb > 0 && (
                  <span className="text-gray-500 text-xs ml-1">
                    ({duplicatesInfo.inFile} dans le fichier, {duplicatesInfo.inDb} en base)
                  </span>
                )}
              </>
            )}
            {invalidRowsCount > 0 && (
              <>
                {' '}
                • <span className="text-red-400">{invalidRowsCount} avec erreur(s)</span>
              </>
            )}
          </p>
          {hasHeaders && detectedColumns.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                <span>
                  Colonnes détectées : {detectedColumns.filter((c) => c.mapped).length}/
                  {detectedColumns.length} mappées
                </span>
                {/* Ne pas afficher les colonnes non mappées si on a exactement 2 colonnes mappées (Nom Projet et Date Sortie) = CSV Spotify reformaté */}
                {detectedColumns.filter((c) => !c.mapped).length > 0 &&
                  !(
                    detectedColumns.filter((c) => c.mapped).length === 2 &&
                    detectedColumns.some((c) => c.mapped === 'Nom Projet') &&
                    detectedColumns.some((c) => c.mapped === 'Date Sortie')
                  ) && (
                    <div className="group relative inline-flex items-center">
                      <span className="text-yellow-400 cursor-help underline decoration-dotted">
                        ({detectedColumns.filter((c) => !c.mapped).length} non reconnue(s))
                      </span>
                      <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-yellow-500/50 rounded-lg p-3 shadow-lg min-w-[250px]">
                        <div className="text-xs font-semibold text-yellow-400 mb-2">
                          Colonnes non reconnues :
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {detectedColumns
                            .filter((c) => !c.mapped)
                            .map((col, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-yellow-400">•</span>
                                <span className="font-mono">{col.original}</span>
                              </div>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
                          Ces colonnes seront ignorées lors de l'import
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setStep('paste')}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Modifier les données
        </button>
      </div>

      <div
        className="overflow-x-auto flex-1 min-h-0 border border-white/10 rounded-lg"
        style={{ overflowY: 'auto' }}
      >
        <table className="w-full border-collapse min-w-[1150px]">
          <thead className="sticky top-0 bg-gray-900/95 z-10">
            <tr className="border-b border-white/10">
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '45px', width: '45px' }}
              >
                Etat
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '130px' }}
              >
                Nom *
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '100px' }}
              >
                Style
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '110px' }}
              >
                Statut
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '100px' }}
              >
                Collab
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '100px' }}
              >
                Label
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '100px' }}
              >
                Label Final
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '120px' }}
              >
                Date Sortie
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '120px' }}
              >
                Lien
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J7
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J14
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J21
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J28
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J56
              </th>
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                style={{ minWidth: '60px' }}
              >
                J84
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {parsedRows.map((row, index) => {
              const hasErrors = row.errors && row.errors.length > 0;
              const normalizedName = row.name?.trim().toLowerCase() || '';
              const rowStatus = row.status || 'EN_COURS';
              const isDuplicateInFile = parsedRows
                .slice(0, index)
                .some(
                  (r) =>
                    r.name?.trim().toLowerCase() === normalizedName &&
                    (r.status || 'EN_COURS') === rowStatus
                );
              const isDuplicateInDb = existingProjects.some(
                (p) => p.name === normalizedName && p.status === rowStatus
              );
              const isDuplicate = isDuplicateInFile || isDuplicateInDb;
              return (
                <tr
                  key={index}
                  className={`${
                    hasErrors
                      ? 'bg-red-500/10 border-l-4 border-red-500'
                      : isDuplicate
                        ? 'bg-yellow-500/10 border-l-4 border-yellow-500'
                        : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-2 py-2" style={{ width: '45px' }}>
                    {hasErrors ? (
                      <div className="group relative">
                        <AlertCircle size={16} className="text-red-400 cursor-help" />
                        <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-red-500/50 rounded-lg p-2 shadow-lg min-w-[200px]">
                          <div className="text-xs text-red-400 space-y-1">
                            {row.errors?.map((err, i) => (
                              <div key={i}>{err}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : isDuplicate ? (
                      <div className="group relative">
                        <AlertCircle size={16} className="text-yellow-400 cursor-help" />
                        <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-yellow-500/50 rounded-lg p-2 shadow-lg min-w-[250px]">
                          <div className="text-xs text-yellow-400 space-y-1">
                            <div className="font-semibold mb-1">Doublon détecté</div>
                            {isDuplicateInFile && (
                              <div>• Doublon dans le fichier (même nom + statut)</div>
                            )}
                            {isDuplicateInDb && <div>• Existe déjà en base de données</div>}
                            <div className="text-gray-400 mt-1 text-xs">
                              Statut:{' '}
                              {PROJECT_STATUSES.find((s) => s.value === rowStatus)?.label ||
                                rowStatus}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Check size={16} className="text-green-400" />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.name || ''}
                      onChange={(e) => handleUpdateRow(index, 'name', e.target.value)}
                      className={`w-full bg-gray-800/50 border rounded px-2 py-1 text-sm text-white ${
                        !row.name || row.name.trim() === ''
                          ? 'border-red-500/50'
                          : 'border-purple-500/30'
                      } focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[120px]`}
                      placeholder="Nom requis"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.style || ''}
                      onChange={(e) => handleUpdateRow(index, 'style', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                      placeholder="Style"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.status || 'EN_COURS'}
                      onChange={(e) =>
                        handleUpdateRow(index, 'status', e.target.value as ProjectStatus)
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[100px]"
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.collab || ''}
                      onChange={(e) => handleUpdateRow(index, 'collab', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                      placeholder="Collab"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.label || ''}
                      onChange={(e) => handleUpdateRow(index, 'label', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                      placeholder="Label"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.labelFinal || ''}
                      onChange={(e) => handleUpdateRow(index, 'labelFinal', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                      placeholder="Label Final"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.releaseDate || ''}
                      onChange={(e) => handleUpdateRow(index, 'releaseDate', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[110px]"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.externalLink || ''}
                      onChange={(e) => handleUpdateRow(index, 'externalLink', e.target.value)}
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[110px]"
                      placeholder="URL"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ7 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ7',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ14 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ14',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ21 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ21',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ28 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ28',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ56 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ56',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.streamsJ84 ?? ''}
                      onChange={(e) =>
                        handleUpdateRow(
                          index,
                          'streamsJ84',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {duplicatesInfo.inDb > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <Checkbox
            checked={overwriteDuplicates}
            onCheckedChange={setOverwriteDuplicates}
            label={`Écraser les ${duplicatesInfo.inDb} projet(s) existant(s) en base de données avec les nouvelles valeurs`}
          />
          <p className="text-xs text-yellow-300 mt-2 ml-6">
            Si désactivé, les projets existants seront ignorés et seuls les nouveaux projets seront
            importés.
          </p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => setStep('paste')}
          className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          Retour
        </button>
        <button
          onClick={handleImport}
          disabled={isImporting || projectsToImportCount === 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Import en cours...
            </>
          ) : (
            <>
              <Check size={16} aria-hidden="true" />
              Importer {projectsToImportCount} projet(s)
              {duplicatesInfo.inDb > 0 &&
                overwriteDuplicates &&
                ` (${duplicatesInfo.uniqueCount} nouveau(x) + ${duplicatesInfo.inDb} mis à jour)`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
