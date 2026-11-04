'use client';

import { Edit, Loader2, Lock, Save, Send, Trash2, X } from 'lucide-react';

import { type LiveSubmission } from '@/types/live';

interface SubmissionActionsProps {
  activeSubmission: LiveSubmission | null;
  description: string;
  draftId: string | null;
  handleDelete: () => Promise<void>;
  handleDeleteSubmission: () => Promise<void>;
  isEditing: boolean;
  isSubmitting: boolean;
  isUploadingDraft: boolean;
  selectedFile: File | null;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  title: string;
}

export function SubmissionActions({
  activeSubmission,
  description,
  draftId,
  handleDelete,
  handleDeleteSubmission,
  isEditing,
  isSubmitting,
  isUploadingDraft,
  selectedFile,
  setDescription,
  setIsEditing,
  setTitle,
  title,
}: SubmissionActionsProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {activeSubmission ? (
        <>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  // Restaurer les valeurs originales
                  setTitle(activeSubmission.title);
                  setDescription(activeSubmission.description || '');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2 v2:rounded-xl v2:bg-white/[0.04] v2:font-sans v2:font-semibold v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.08] v2:active:scale-[0.98]"
              >
                <X className="w-5 h-5" />
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:font-sans v2:font-semibold v2:shadow-none v2:hover:brightness-110 v2:active:scale-[0.98]"
                aria-label="Sauvegarder les modifications"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                SAVE CHANGES
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDeleteSubmission}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center v2:text-red-400 v2:ring-1 v2:ring-inset v2:ring-red-500/20"
                title="Delete Submission"
                aria-label="Supprimer la soumission"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditing(true);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200 flex items-center justify-center gap-2 v2:rounded-xl v2:bg-white/[0.04] v2:font-sans v2:font-semibold v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.08] v2:active:scale-[0.98]"
                aria-label="Modifier les informations"
              >
                <Edit className="w-5 h-5" />
                EDIT DETAILS
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="text-green-500 font-medium text-sm">SUBMITTED</span>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Bouton Delete Draft (si draft existe) */}
          {(draftId || selectedFile) && (
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center v2:text-red-400 v2:ring-1 v2:ring-inset v2:ring-red-500/20"
              title="Clear Form"
              aria-label="Effacer le formulaire"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {/* Bouton Submit */}
          <button
            type="submit"
            disabled={(!selectedFile && !draftId) || isSubmitting || isUploadingDraft}
            className={`
          flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500
          text-white py-3 px-6 rounded-xl font-audiowide transition-all duration-200
          flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20
          disabled:opacity-50 disabled:cursor-not-allowed
          v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:hover:from-brand v2:hover:to-purple-600 v2:hover:brightness-110
          v2:font-sans v2:font-semibold v2:shadow-none v2:active:scale-[0.98]
        `}
            aria-label="Soumettre la piste"
          >
            {isSubmitting || isUploadingDraft ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isUploadingDraft ? 'UPLOADING...' : 'SENDING...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                SUBMIT TRACK
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
