'use client';

import {
  Upload,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  X,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

import Modal from '@/components/ui/Modal';
import { parseStreamsCsv, StreamsCsvData } from '@/lib/utils/parseStreamsCsv';
import {
  calculateStreamsMilestones,
  StreamsMilestones,
} from '@/lib/utils/calculateStreamsMilestones';
import { findProjectCandidates, ProjectCandidate } from '@/lib/utils/findProjectCandidates';
import { Project } from './types';

/**
 * Formate une date ISO en format français (DD/MM/YYYY)
 */
function formatDateFrench(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

interface ImportStreamsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (imports: Array<{ projectId: string; milestones: StreamsMilestones }>) => Promise<{
    success: boolean;
    updated: number;
    failed: number;
    errors?: Array<{ fileName: string; error: string }>;
  }>;
  projects: Project[];
}

interface FileImportData {
  file: File;
  csvData: StreamsCsvData;
  candidates: ProjectCandidate[];
  selectedProjectId: string | null;
  milestones: ReturnType<typeof calculateStreamsMilestones> | null;
  error?: string;
  isValidated?: boolean; // Nouveau: indique si le fichier a été validé
}

type DialogStep = 'upload' | 'preview' | 'result';
type FileStatus = 'pending' | 'validated' | 'error';

export const ImportStreamsDialog = ({
  isOpen,
  onClose,
  onImport,
  projects,
}: ImportStreamsDialogProps) => {
  const [step, setStep] = useState<DialogStep>('upload');
  const [filesData, setFilesData] = useState<FileImportData[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    updated: number;
    failed: number;
    errors?: Array<{ fileName: string; error: string }>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleClose = useCallback(() => {
    if (isProcessing || isImporting) return;
    setStep('upload');
    setFilesData([]);
    setCurrentFileIndex(0);
    setImportResult(null);
    setIsDragging(false);
    setIsTransitioning(false);
    onClose();
  }, [isProcessing, isImporting, onClose]);

  // Réinitialiser l'index quand les fichiers changent
  useEffect(() => {
    if (filesData.length > 0 && currentFileIndex >= filesData.length) {
      setCurrentFileIndex(0);
    }
  }, [filesData.length, currentFileIndex]);

  const processFile = useCallback(
    async (file: File): Promise<FileImportData | null> => {
      try {
        const text = await file.text();
        const csvData = parseStreamsCsv(text, file.name);

        if (csvData.errors && csvData.errors.length > 0) {
          return {
            file,
            csvData,
            candidates: [],
            selectedProjectId: null,
            milestones: null,
            error: csvData.errors.join(', '),
          };
        }

        // Trouver les candidats
        const candidates = findProjectCandidates(csvData.projectName, projects);

        // Si un seul candidat avec score élevé, le sélectionner automatiquement
        let selectedProjectId: string | null = null;
        let milestones: ReturnType<typeof calculateStreamsMilestones> | null = null;

        if (candidates.length > 0 && candidates[0].score >= 80) {
          const bestCandidate = candidates[0].project;
          selectedProjectId = bestCandidate.id;

          // Calculer les jalons si on a une date de release
          if (bestCandidate.releaseDate) {
            // Convertir la date ISO en format YYYY-MM-DD
            const releaseDate = new Date(bestCandidate.releaseDate);
            const releaseDateStr = `${releaseDate.getFullYear()}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${String(releaseDate.getDate()).padStart(2, '0')}`;

            milestones = calculateStreamsMilestones(releaseDateStr, csvData.streams);
          } else {
            return {
              file,
              csvData,
              candidates,
              selectedProjectId: null,
              milestones: null,
              error: "Le projet sélectionné n'a pas de date de release",
            };
          }
        }

        return {
          file,
          csvData,
          candidates,
          selectedProjectId,
          milestones,
        };
      } catch (error) {
        return {
          file,
          csvData: {
            fileName: file.name,
            projectName: '',
            streams: [],
            errors: ['Erreur lors de la lecture du fichier'],
          },
          candidates: [],
          selectedProjectId: null,
          milestones: null,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
      }
    },
    [projects]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((file) => {
        const extension = file.name.toLowerCase().split('.').pop();
        return extension === 'csv';
      });

      if (fileArray.length === 0) {
        alert('Veuillez sélectionner au moins un fichier CSV');
        return;
      }

      setIsProcessing(true);
      setStep('preview');
      setCurrentFileIndex(0);

      try {
        const processedFiles = await Promise.all(fileArray.map(processFile));
        const validFiles = processedFiles.filter((f): f is FileImportData => f !== null);
        setFilesData(validFiles);

        // Si un fichier a été auto-sélectionné (score >= 80), le marquer comme validé
        validFiles.forEach((file, index) => {
          if (file.selectedProjectId && file.milestones && !file.error) {
            file.isValidated = true;
          }
        });
      } catch (error) {
        console.error('Erreur lors du traitement des fichiers:', error);
        alert('Erreur lors du traitement des fichiers');
      } finally {
        setIsProcessing(false);
      }
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFilesData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleNext = useCallback(() => {
    setFilesData((prev) => {
      if (currentFileIndex < prev.length - 1) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentFileIndex((prevIndex) => {
            const newIndex = Math.min(prevIndex + 1, prev.length - 1);
            setIsTransitioning(false);
            return newIndex;
          });
        }, 150);
      }
      return prev;
    });
  }, [currentFileIndex]);

  const handlePrevious = useCallback(() => {
    if (currentFileIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFileIndex((prev) => {
          const newIndex = Math.max(prev - 1, 0);
          setIsTransitioning(false);
          return newIndex;
        });
      }, 150);
    }
  }, [currentFileIndex]);

  const handleGoToFile = useCallback((index: number) => {
    setFilesData((prev) => {
      if (index >= 0 && index < prev.length) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentFileIndex(index);
          setIsTransitioning(false);
        }, 150);
      }
      return prev;
    });
  }, []);

  const handleSelectProject = useCallback(
    (fileIndex: number, projectId: string, shouldAutoAdvance = true) => {
      setFilesData((prev) => {
        const updated = [...prev];
        const fileData = updated[fileIndex];
        const project = projects.find((p) => p.id === projectId);

        if (!project) return prev;

        let milestones: ReturnType<typeof calculateStreamsMilestones> | null = null;
        let error: string | undefined;

        if (project.releaseDate) {
          // Convertir la date ISO en format YYYY-MM-DD
          const releaseDate = new Date(project.releaseDate);
          const releaseDateStr = `${releaseDate.getFullYear()}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}-${String(releaseDate.getDate()).padStart(2, '0')}`;

          milestones = calculateStreamsMilestones(releaseDateStr, fileData.csvData.streams);
        } else {
          error = "Le projet sélectionné n'a pas de date de release";
        }

        updated[fileIndex] = {
          ...fileData,
          selectedProjectId: projectId,
          milestones,
          error,
          isValidated: !error && milestones !== null,
        };

        // Auto-advance si activé et que le fichier est valide
        if (shouldAutoAdvance && !error && milestones !== null && fileIndex === currentFileIndex) {
          setTimeout(() => {
            if (fileIndex < updated.length - 1) {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentFileIndex((prev) => Math.min(prev + 1, updated.length - 1));
                setIsTransitioning(false);
              }, 150);
            }
          }, 300); // Petit délai pour l'animation
        }

        return updated;
      });
    },
    [projects, currentFileIndex]
  );

  const handleValidateAndContinue = useCallback(() => {
    setFilesData((prev) => {
      const currentFile = prev[currentFileIndex];
      if (
        currentFile &&
        currentFile.selectedProjectId &&
        currentFile.milestones &&
        !currentFile.error
      ) {
        const updated = [...prev];
        updated[currentFileIndex] = {
          ...updated[currentFileIndex],
          isValidated: true,
        };

        // Avancer au suivant si possible
        if (currentFileIndex < updated.length - 1) {
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentFileIndex((prevIndex) => {
              const newIndex = Math.min(prevIndex + 1, updated.length - 1);
              setIsTransitioning(false);
              return newIndex;
            });
          }, 300);
        }

        return updated;
      }
      return prev;
    });
  }, [currentFileIndex]);

  const validatedFiles = useMemo(
    () => filesData.filter((f) => f.isValidated && f.selectedProjectId && f.milestones && !f.error),
    [filesData]
  );

  const handleImport = useCallback(async () => {
    if (validatedFiles.length === 0) {
      alert('Veuillez valider au moins un fichier pour importer');
      return;
    }

    setIsImporting(true);
    setStep('result');

    try {
      const imports = validatedFiles.map((f) => ({
        projectId: f.selectedProjectId!,
        milestones: f.milestones!,
      }));

      const result = await onImport(imports);
      setImportResult(result);
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setImportResult({
        success: false,
        updated: 0,
        failed: validatedFiles.length,
        errors: [
          {
            fileName: 'Import',
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          },
        ],
      });
    } finally {
      setIsImporting(false);
    }
  }, [validatedFiles, onImport]);

  const getFileStatus = useCallback((fileData: FileImportData): FileStatus => {
    if (fileData.error) return 'error';
    if (fileData.isValidated && fileData.selectedProjectId && fileData.milestones)
      return 'validated';
    return 'pending';
  }, []);

  const currentFile = filesData[currentFileIndex];

  if (!isOpen) return null;

  return (
    <Modal maxWidth="max-w-4xl" onClose={handleClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Importer des Streams CSV</h2>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-xl p-16 text-center transition-all duration-200
                ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/20 scale-[1.02]'
                    : 'border-gray-600 bg-gradient-to-br from-gray-800/40 to-gray-900/40 hover:border-gray-500'
                }
              `}
            >
              <div
                className={`mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-purple-500/30' : 'bg-gray-700/50'
                }`}
              >
                <Upload className={`w-8 h-8 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
              </div>
              <p className="text-gray-200 text-lg font-medium mb-2">
                Glissez-déposez vos fichiers CSV ici
              </p>
              <p className="text-gray-400 text-sm mb-6">
                ou cliquez sur le bouton ci-dessous pour sélectionner
              </p>
              <p className="text-xs text-gray-500 mb-6 bg-gray-800/50 rounded-lg p-3 inline-block">
                Format attendu: <code className="text-purple-400">date,streams</code> (un fichier
                par projet)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-purple-500/20"
              >
                Sélectionner des fichiers CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {isProcessing && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-500" />
                <p className="text-gray-400">Traitement des fichiers...</p>
              </div>
            )}

            {!isProcessing && filesData.length > 0 && currentFile && (
              <>
                {/* Barre de navigation */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevious}
                        disabled={currentFileIndex === 0}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        aria-label="Fichier précédent"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium text-gray-300 min-w-[120px] text-center">
                        Fichier {currentFileIndex + 1} sur {filesData.length}
                      </span>
                      <button
                        onClick={handleNext}
                        disabled={currentFileIndex === filesData.length - 1}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        aria-label="Fichier suivant"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    {getFileStatus(currentFile) === 'validated' && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-300 font-medium">Validé</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFile(currentFileIndex)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Retirer ce fichier"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Carte principale du fichier actuel */}
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
                      <p className="text-white font-semibold text-lg mb-1 truncate">
                        {currentFile.file.name}
                      </p>
                      <p className="text-sm text-gray-400 mb-1">
                        Projet détecté:{' '}
                        <span className="text-purple-400 font-medium">
                          {currentFile.csvData.projectName}
                        </span>
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
                                <span className="text-white font-semibold">
                                  {bestCandidate.project.name}
                                </span>
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
                                      checked={
                                        currentFile.selectedProjectId === candidate.project.id
                                      }
                                      onChange={() =>
                                        handleSelectProject(
                                          currentFileIndex,
                                          candidate.project.id,
                                          true
                                        )
                                      }
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <div className="flex-1">
                                      <p className="text-white font-medium">
                                        {candidate.project.name}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        Score:{' '}
                                        <span className="text-purple-400 font-medium">
                                          {candidate.score}%
                                        </span>{' '}
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
                              <span>
                                Aucun projet candidat trouvé. Veuillez vérifier le nom du fichier.
                              </span>
                            </div>
                          )}

                          {currentFile.milestones && (
                            <div className="mt-4 p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-lg border border-gray-700/50">
                              <p className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Jalons calculés:
                              </p>

                              {/* Jalons court terme (J7-J84) */}
                              <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                                  Court terme
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {[
                                    {
                                      key: 'streamsJ7',
                                      label: 'J7',
                                      value: currentFile.milestones.streamsJ7,
                                    },
                                    {
                                      key: 'streamsJ14',
                                      label: 'J14',
                                      value: currentFile.milestones.streamsJ14,
                                    },
                                    {
                                      key: 'streamsJ21',
                                      label: 'J21',
                                      value: currentFile.milestones.streamsJ21,
                                    },
                                    {
                                      key: 'streamsJ28',
                                      label: 'J28',
                                      value: currentFile.milestones.streamsJ28,
                                    },
                                    {
                                      key: 'streamsJ56',
                                      label: 'J56',
                                      value: currentFile.milestones.streamsJ56,
                                    },
                                    {
                                      key: 'streamsJ84',
                                      label: 'J84',
                                      value: currentFile.milestones.streamsJ84,
                                    },
                                  ].map((milestone) => (
                                    <div
                                      key={milestone.key}
                                      className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50"
                                    >
                                      <span className="text-xs text-gray-400 block mb-1">
                                        {milestone.label}
                                      </span>
                                      <span className="text-white font-semibold text-sm">
                                        {milestone.value !== null ? (
                                          milestone.value.toLocaleString()
                                        ) : (
                                          <span className="text-gray-500 italic">N/A</span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Jalons long terme (J180-J365) */}
                              <div>
                                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                                  Long terme
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    {
                                      key: 'streamsJ180',
                                      label: 'J180 (6 mois)',
                                      value: currentFile.milestones.streamsJ180,
                                    },
                                    {
                                      key: 'streamsJ365',
                                      label: 'J365 (1 an)',
                                      value: currentFile.milestones.streamsJ365,
                                    },
                                  ].map((milestone) => (
                                    <div
                                      key={milestone.key}
                                      className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50"
                                    >
                                      <span className="text-xs text-gray-400 block mb-1">
                                        {milestone.label}
                                      </span>
                                      <span className="text-white font-semibold text-sm">
                                        {milestone.value !== null ? (
                                          milestone.value.toLocaleString()
                                        ) : (
                                          <span className="text-gray-500 italic">N/A</span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

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

                {/* Queue compacte */}
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-3 font-medium">
                    Queue d'import ({validatedFiles.length}/{filesData.length} validés)
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {filesData.map((fileData, index) => {
                      const status = getFileStatus(fileData);
                      const isCurrent = index === currentFileIndex;

                      return (
                        <button
                          key={index}
                          onClick={() => handleGoToFile(index)}
                          className={`
                            flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[140px]
                            ${
                              isCurrent
                                ? 'bg-purple-600/30 border-purple-500 shadow-md'
                                : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                            }
                          `}
                          title={fileData.file.name}
                        >
                          {status === 'validated' && (
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                          {status === 'pending' && (
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          {status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs font-medium truncate ${
                              isCurrent ? 'text-white' : 'text-gray-300'
                            }`}
                          >
                            {index + 1}. {fileData.file.name.split('.')[0].slice(0, 12)}
                            {fileData.file.name.split('.')[0].length > 12 ? '...' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions finales */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400 text-center sm:text-left">
                    {validatedFiles.length} fichier(s) validé(s) sur {filesData.length}
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleClose}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={validatedFiles.length === 0 || isImporting}
                      className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center justify-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Import...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Importer ({validatedFiles.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            {importResult.success ? (
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="text-green-300 font-medium">Import réussi!</p>
                </div>
                <p className="text-sm text-gray-300">
                  {importResult.updated} projet(s) mis à jour avec succès
                </p>
                {importResult.failed > 0 && (
                  <p className="text-sm text-yellow-300 mt-2">
                    {importResult.failed} projet(s) n'ont pas pu être mis à jour
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300 font-medium">Erreur lors de l'import</p>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="text-sm text-gray-300 mt-2 list-disc list-inside">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>
                        {error.fileName}: {error.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
