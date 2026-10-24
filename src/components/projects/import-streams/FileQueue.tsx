'use client';

import { AlertCircle, Check, Clock } from 'lucide-react';

import { getFileStatus } from './streamsUtils';
import { type FileImportData } from './types';

interface FileQueueProps {
  currentFileIndex: number;
  filesData: FileImportData[];
  handleGoToFile: (index: number) => void;
  validatedFiles: FileImportData[];
}

export function FileQueue({
  currentFileIndex,
  filesData,
  handleGoToFile,
  validatedFiles,
}: FileQueueProps) {
  return (
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
              {status === 'validated' && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
              {status === 'pending' && <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
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
  );
}
