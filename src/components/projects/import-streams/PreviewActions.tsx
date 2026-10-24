'use client';

import { Check, Loader2 } from 'lucide-react';

import { type FileImportData } from './types';

interface PreviewActionsProps {
  filesData: FileImportData[];
  handleClose: () => void;
  handleImport: () => Promise<void>;
  isImporting: boolean;
  validatedFiles: FileImportData[];
}

export function PreviewActions({
  filesData,
  handleClose,
  handleImport,
  isImporting,
  validatedFiles,
}: PreviewActionsProps) {
  return (
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
  );
}
