'use client';

import type { Dispatch, SetStateAction } from 'react';

interface LinkEditModalProps {
  handleSaveLink: () => Promise<void>;
  linkValue: string;
  setEditingLinkId: Dispatch<SetStateAction<string | null>>;
  setLinkValue: Dispatch<SetStateAction<string>>;
}

export function LinkEditModal({
  handleSaveLink,
  linkValue,
  setEditingLinkId,
  setLinkValue,
}: LinkEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setEditingLinkId(null);
          setLinkValue('');
        }
      }}
    >
      <div className="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] border border-purple-500/30 rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Modifier le lien</h3>
        <input
          type="url"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          placeholder="https://..."
          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveLink();
            } else if (e.key === 'Escape') {
              setEditingLinkId(null);
              setLinkValue('');
            }
          }}
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setEditingLinkId(null);
              setLinkValue('');
            }}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveLink}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
