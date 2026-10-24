'use client';

import { Loader2 } from 'lucide-react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

import Modal from '@/components/ui/Modal';
import {
  calculateStreamsMilestones,
  StreamsMilestones,
} from '@/lib/utils/calculateStreamsMilestones';
import { Project } from './types';
import { FileCard } from './import-streams/FileCard';
import { FileNavBar } from './import-streams/FileNavBar';
import { FileQueue } from './import-streams/FileQueue';
import { PreviewActions } from './import-streams/PreviewActions';
import { ResultStep } from './import-streams/ResultStep';
import { UploadStep } from './import-streams/UploadStep';
import type { DialogStep, FileImportData, ImportStreamsResult } from './import-streams/types';
import {
  analyzeStreamsFile,
  getValidatedFiles,
  NO_RELEASE_DATE_ERROR,
  toIsoDateOnly,
} from './import-streams/streamsUtils';

interface ImportStreamsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    imports: Array<{ projectId: string; milestones: StreamsMilestones }>
  ) => Promise<ImportStreamsResult>;
  projects: Project[];
}

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
  const [importResult, setImportResult] = useState<ImportStreamsResult | null>(null);
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
        return analyzeStreamsFile(file, text, projects);
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

  // Les updaters passés à setState restent purs : pas de setTimeout ni de setState imbriqué
  // dedans (StrictMode peut les appeler deux fois). Les effets de bord sont lancés ici.
  const handleNext = useCallback(() => {
    if (currentFileIndex < filesData.length - 1) {
      const lastIndex = filesData.length - 1;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFileIndex((prevIndex) => Math.min(prevIndex + 1, lastIndex));
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentFileIndex, filesData.length]);

  const handlePrevious = useCallback(() => {
    if (currentFileIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFileIndex((prev) => Math.max(prev - 1, 0));
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentFileIndex]);

  const handleGoToFile = useCallback(
    (index: number) => {
      if (index >= 0 && index < filesData.length) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentFileIndex(index);
          setIsTransitioning(false);
        }, 150);
      }
    },
    [filesData.length]
  );

  const handleSelectProject = useCallback(
    (fileIndex: number, projectId: string, shouldAutoAdvance = true) => {
      const project = projects.find((p) => p.id === projectId);

      if (!project) return;

      const fileData = filesData[fileIndex];
      let milestones: ReturnType<typeof calculateStreamsMilestones> | null = null;
      let error: string | undefined;

      if (project.releaseDate) {
        // Convertir la date ISO en format YYYY-MM-DD
        milestones = calculateStreamsMilestones(
          toIsoDateOnly(project.releaseDate),
          fileData.csvData.streams
        );
      } else {
        error = NO_RELEASE_DATE_ERROR;
      }

      const updated = [...filesData];
      updated[fileIndex] = {
        ...fileData,
        selectedProjectId: projectId,
        milestones,
        error,
        isValidated: !error && milestones !== null,
      };
      setFilesData(updated);

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
    },
    [projects, filesData, currentFileIndex]
  );

  const handleValidateAndContinue = useCallback(() => {
    const currentFile = filesData[currentFileIndex];
    if (
      currentFile &&
      currentFile.selectedProjectId &&
      currentFile.milestones &&
      !currentFile.error
    ) {
      const updated = [...filesData];
      updated[currentFileIndex] = {
        ...updated[currentFileIndex],
        isValidated: true,
      };
      setFilesData(updated);

      // Avancer au suivant si possible
      if (currentFileIndex < updated.length - 1) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentFileIndex((prevIndex) => Math.min(prevIndex + 1, updated.length - 1));
          setIsTransitioning(false);
        }, 300);
      }
    }
  }, [filesData, currentFileIndex]);

  const validatedFiles = useMemo(() => getValidatedFiles(filesData), [filesData]);

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

  const currentFile = filesData[currentFileIndex];

  if (!isOpen) return null;

  return (
    <Modal maxWidth="max-w-4xl" onClose={handleClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Importer des Streams CSV</h2>
        </div>

        {step === 'upload' && (
          <UploadStep
            dropZoneRef={dropZoneRef}
            fileInputRef={fileInputRef}
            handleDragLeave={handleDragLeave}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleFileInputChange={handleFileInputChange}
            isDragging={isDragging}
          />
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
                <FileNavBar
                  currentFile={currentFile}
                  currentFileIndex={currentFileIndex}
                  filesData={filesData}
                  handleNext={handleNext}
                  handlePrevious={handlePrevious}
                  handleRemoveFile={handleRemoveFile}
                />
                {/* Carte principale du fichier actuel */}
                <FileCard
                  currentFile={currentFile}
                  currentFileIndex={currentFileIndex}
                  handleSelectProject={handleSelectProject}
                  handleValidateAndContinue={handleValidateAndContinue}
                  isTransitioning={isTransitioning}
                />

                {/* Queue compacte */}
                <FileQueue
                  currentFileIndex={currentFileIndex}
                  filesData={filesData}
                  handleGoToFile={handleGoToFile}
                  validatedFiles={validatedFiles}
                />

                {/* Actions finales */}
                <PreviewActions
                  filesData={filesData}
                  handleClose={handleClose}
                  handleImport={handleImport}
                  isImporting={isImporting}
                  validatedFiles={validatedFiles}
                />
              </>
            )}
          </div>
        )}

        {step === 'result' && importResult && (
          <ResultStep handleClose={handleClose} importResult={importResult} />
        )}
      </div>
    </Modal>
  );
};
