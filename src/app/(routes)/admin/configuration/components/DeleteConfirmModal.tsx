'use client';

import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { ImageMeta } from '@/app/api/admin/images/shared';

interface DeleteConfirmModalProps {
  deleteTarget: ImageMeta;
  selectedImageIds: string[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({
  deleteTarget,
  selectedImageIds,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const isMultiDelete = deleteTarget.id === 'multi';

  return (
    <Modal
      maxWidth="max-w-md"
      bgClass="bg-gradient-to-br from-gray-900 to-gray-850 backdrop-blur-sm"
      borderClass="border-red-500/30"
      onClose={onClose}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="text-center text-white text-lg font-semibold mb-2">
          {isMultiDelete ? (
            <>
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="text-red-300">{selectedImageIds.length} images</span> ?
            </>
          ) : (
            <>
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="text-red-300">{deleteTarget.name}</span> ?
            </>
          )}
        </div>
        <div className="text-gray-400 text-sm mb-4">
          Cette action ne peut pas être annulée. Cela supprimera définitivement{' '}
          {isMultiDelete ? 'les images sélectionnées' : "l'image"}.
        </div>
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 hover:bg-gray-800"
          >
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Supprimer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

