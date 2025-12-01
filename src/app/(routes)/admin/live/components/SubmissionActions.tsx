'use client';

import { useState, useRef } from 'react';
import { CheckCircle, XCircle, Play, Pause, Download } from 'lucide-react';
import { toast } from 'sonner';

import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { LiveSubmissionStatus } from '@/types/live';
import AudioPlayer from '@/components/ui/AudioPlayer';

interface SubmissionActionsProps {
  submission: {
    id: string;
    fileUrl: string;
    status: LiveSubmissionStatus;
    fileName: string;
  };
  onStatusUpdate: () => void;
}

export function SubmissionActions({ submission, onStatusUpdate }: SubmissionActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleStatusUpdate = async (
    newStatus: LiveSubmissionStatus.APPROVED | LiveSubmissionStatus.REJECTED
  ) => {
    const confirmMessage =
      newStatus === LiveSubmissionStatus.APPROVED
        ? 'Êtes-vous sûr de vouloir approuver cette soumission ?'
        : 'Êtes-vous sûr de vouloir rejeter cette soumission ?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetchWithAuth(`/api/admin/live/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();
      toast.success(
        result.message ||
          `Soumission ${newStatus === LiveSubmissionStatus.APPROVED ? 'approuvée' : 'rejetée'} avec succès`
      );
      onStatusUpdate();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const isPending = submission.status === LiveSubmissionStatus.PENDING;

  return (
    <div className="relative flex items-center space-x-2">
      {/* Bouton prévisualisation */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Prévisualiser l'audio"
      >
        {showPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Télécharger */}
      <a
        href={submission.fileUrl}
        download={submission.fileName}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Télécharger le fichier"
      >
        <Download className="h-4 w-4" />
      </a>

      {/* Actions d'approbation/rejet */}
      {isPending && (
        <>
          <button
            onClick={() => handleStatusUpdate(LiveSubmissionStatus.APPROVED)}
            disabled={isUpdating}
            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Approuver"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleStatusUpdate(LiveSubmissionStatus.REJECTED)}
            disabled={isUpdating}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rejeter"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Prévisualisation audio */}
      {showPreview && (
        <div className="absolute right-0 top-full mt-2 z-50 p-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700 min-w-[400px] max-w-[500px]">
          <div className="mb-2 text-sm text-gray-300 font-medium truncate">
            {submission.fileName}
          </div>
          <AudioPlayer ref={audioRef} src={submission.fileUrl} />
          <button
            onClick={() => setShowPreview(false)}
            className="mt-2 text-xs text-gray-400 hover:text-white underline"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
