'use client';

import { AlertCircle, Check } from 'lucide-react';

import { type ImportStreamsResult } from './types';

interface ResultStepProps {
  handleClose: () => void;
  importResult: ImportStreamsResult;
}

export function ResultStep({ handleClose, importResult }: ResultStepProps) {
  return (
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
  );
}
