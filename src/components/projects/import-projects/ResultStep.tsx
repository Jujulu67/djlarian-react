'use client';

import { AlertCircle, Check } from 'lucide-react';
import type { ImportResult } from './types';

interface ResultStepProps {
  handleClose: () => void;
  importResult: ImportResult;
}

export function ResultStep({ handleClose, importResult }: ResultStepProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div
        className={`p-4 rounded-lg border ${
          importResult.success
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {importResult.success ? (
            <Check size={24} className="text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3
              className={`text-lg font-semibold ${
                importResult.success ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {importResult.success ? 'Import réussi !' : "Erreur lors de l'import"}
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              {importResult.created} projet(s) créé(s)
              {importResult.failed > 0 && ` • ${importResult.failed} échec(s)`}
              {importResult.duplicatesExcluded !== undefined &&
                importResult.duplicatesExcluded > 0 && (
                  <span className="text-yellow-400">
                    {' '}
                    • {importResult.duplicatesExcluded} doublon(s) exclu(s)
                  </span>
                )}
            </p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-400">
                    Ligne {err.index + 1}: {err.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
