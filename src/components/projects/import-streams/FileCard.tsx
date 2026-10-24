'use client';

import { AlertCircle, Check, FileText } from 'lucide-react';

import { formatDateFrench } from '@/lib/utils/format';
import { MilestonesPanel } from './MilestonesPanel';
import { type FileImportData } from './types';

interface FileCardProps {
  currentFile: FileImportData;
  currentFileIndex: number;
  handleSelectProject: (fileIndex: number, projectId: string, shouldAutoAdvance?: boolean) => void;
  handleValidateAndContinue: () => void;
  isTransitioning: boolean;
}

export function FileCard({
  currentFile,
  currentFileIndex,
  handleSelectProject,
  handleValidateAndContinue,
  isTransitioning,
}: FileCardProps) {
  return (
    <div
      className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-5 md:p-6 border border-gray-700/50 shadow-lg transition-opacity duration-150 ${
        isTransitioning ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
          <FileText className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-lg mb-1 truncate">{currentFile.file.name}</p>
          <p className="text-sm text-gray-400 mb-1">
            Projet détecté:{' '}
            <span className="text-purple-400 font-medium">{currentFile.csvData.projectName}</span>
          </p>
          <p className="text-xs text-gray-500">
            {currentFile.csvData.streams.length} points de données
          </p>
        </div>
      </div>

      {currentFile.error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{currentFile.error}</span>
        </div>
      )}

      {!currentFile.error &&
        (() => {
          const bestCandidate = currentFile.candidates[0];
          const isExactMatch = bestCandidate?.score === 100;
          const showCandidates = currentFile.candidates.length > 0 && !isExactMatch;

          return (
            <>
              {isExactMatch && bestCandidate && (
                <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <p className="text-green-300 font-medium">Match exact trouvé!</p>
                  </div>
                  <p className="text-sm text-gray-300">
                    Projet:{' '}
                    <span className="text-white font-semibold">{bestCandidate.project.name}</span>
                    {bestCandidate.project.releaseDate && (
                      <span className="text-gray-400">
                        {' '}
                        • Release: {formatDateFrench(bestCandidate.project.releaseDate)}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {showCandidates && (
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    Sélectionner un projet:
                  </label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {currentFile.candidates.map((candidate) => (
                      <label
                        key={candidate.project.id}
                        className={`
                                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                    ${
                                      currentFile.selectedProjectId === candidate.project.id
                                        ? 'bg-purple-600/30 border-purple-500 shadow-md'
                                        : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500'
                                    }
                                  `}
                      >
                        <input
                          type="radio"
                          name={`project-${currentFileIndex}`}
                          checked={currentFile.selectedProjectId === candidate.project.id}
                          onChange={() =>
                            handleSelectProject(currentFileIndex, candidate.project.id, true)
                          }
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{candidate.project.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Score:{' '}
                            <span className="text-purple-400 font-medium">{candidate.score}%</span>{' '}
                            • {candidate.reason}
                            {candidate.project.releaseDate
                              ? ` • Release: ${formatDateFrench(candidate.project.releaseDate)}`
                              : ' • Pas de date de release'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentFile.candidates.length === 0 && !currentFile.error && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-sm text-yellow-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Aucun projet candidat trouvé. Veuillez vérifier le nom du fichier.</span>
                </div>
              )}

              {currentFile.milestones && <MilestonesPanel milestones={currentFile.milestones} />}

              {/* Bouton Valider et continuer */}
              {currentFile.selectedProjectId &&
                currentFile.milestones &&
                !currentFile.error &&
                !currentFile.isValidated && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                      onClick={handleValidateAndContinue}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Valider et continuer
                    </button>
                  </div>
                )}
            </>
          );
        })()}
    </div>
  );
}
