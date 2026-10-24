'use client';

import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { getFileStatus } from './streamsUtils';
import { type FileImportData } from './types';

interface FileNavBarProps {
  currentFile: FileImportData;
  currentFileIndex: number;
  filesData: FileImportData[];
  handleNext: () => void;
  handlePrevious: () => void;
  handleRemoveFile: (index: number) => void;
}

export function FileNavBar({
  currentFile,
  currentFileIndex,
  filesData,
  handleNext,
  handlePrevious,
  handleRemoveFile,
}: FileNavBarProps) {
  return (
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
  );
}
