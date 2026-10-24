'use client';

import { Upload } from 'lucide-react';
import type { RefObject, DragEvent, ChangeEvent } from 'react';

interface UploadStepProps {
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDragging: boolean;
}

export function UploadStep({
  dropZoneRef,
  fileInputRef,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileInputChange,
  isDragging,
}: UploadStepProps) {
  return (
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
          Format attendu: <code className="text-purple-400">date,streams</code> (un fichier par
          projet)
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
  );
}
