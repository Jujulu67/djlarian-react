'use client';

import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import Modal from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

import type { GroupedImage } from '../types';

interface FusionModalProps {
  family: { signature: string; groups: GroupedImage[] };
  selectedMasterId: string | null;
  setSelectedMasterId: (id: string | null) => void;
  ignoredIds: string[];
  setIgnoredIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  isLoadingFusion: boolean;
  onClose: () => void;
  onConfirm: (masterId: string, ignoredIds: string[]) => Promise<void>;
}

export const FusionModal = ({
  family,
  selectedMasterId,
  setSelectedMasterId,
  ignoredIds,
  setIgnoredIds,
  isLoadingFusion,
  onClose,
  onConfirm,
}: FusionModalProps) => {
  const handleConfirm = async () => {
    if (!selectedMasterId || ignoredIds.includes(selectedMasterId)) return;
    await onConfirm(selectedMasterId, ignoredIds);
    onClose();
  };

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="font-bold text-lg text-yellow-500 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Fusionner les doublons (taille originale : {(Number(family.signature) / 1024).toFixed(
            1
          )}{' '}
          Ko)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {family.groups.map((group) => {
            const image = group.crop || group.ori;
            if (!image) return null;
            const isIgnored = ignoredIds.includes(image.id);
            const isMaster = selectedMasterId === image.id;
            return (
              <div
                key={group.imageId}
                className={`flex flex-col items-center border rounded-lg p-4 bg-gray-900/60 transition-all duration-200 relative ${
                  isMaster ? 'ring-2 ring-purple-500 bg-purple-900/30' : 'border-gray-700'
                } ${isIgnored ? 'opacity-50 grayscale' : ''}`}
                tabIndex={-1}
                aria-label={`Carte image ${image.name}`}
              >
                <div
                  role="button"
                  tabIndex={isIgnored ? -1 : 0}
                  className={`w-full flex flex-col items-center cursor-pointer ${isIgnored ? 'pointer-events-none' : ''}`}
                  onClick={() => {
                    if (!isIgnored) setSelectedMasterId(image.id);
                  }}
                  onKeyDown={(e) => {
                    if (!isIgnored && (e.key === 'Enter' || e.key === ' ')) {
                      setSelectedMasterId(image.id);
                      e.preventDefault();
                    }
                  }}
                  aria-label={`Sélectionner comme maître ${image.name}`}
                >
                  <Image
                    src={image.url}
                    alt={image.name}
                    width={400}
                    height={128}
                    className="w-full h-32 object-cover rounded mb-2"
                    unoptimized
                  />
                  <div className="text-xs text-gray-300 mb-1">{image.name}</div>
                  <div className="text-purple-300 font-mono text-xs mb-1">
                    {(image.size / 1024).toFixed(1)} Ko
                  </div>
                  {group.linkedTo ? (
                    <div className="text-xs text-blue-400 mb-1">
                      Lié à : {group.linkedTo.title} ({group.linkedTo.type})
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mb-1">Aucun lien</div>
                  )}
                  {isMaster && !isIgnored && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow">
                      Maître
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-center w-full">
                  <Checkbox
                    checked={isIgnored}
                    onCheckedChange={(checked) => {
                      logger.debug('[DEBUG] Checkbox Ignorer changée', {
                        imageId: image.id,
                        checked,
                        prevIgnoredIds: ignoredIds,
                      });
                      setIgnoredIds((prev) => {
                        if (checked) {
                          return Array.from(new Set([...prev, image.id]));
                        } else {
                          return prev.filter((id) => id !== image.id);
                        }
                      });
                      if (checked && selectedMasterId === image.id) setSelectedMasterId(null);
                    }}
                    label="Ignorer"
                    className="text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="outline"
            className="bg-purple-600 text-white hover:bg-purple-700"
            disabled={!selectedMasterId || ignoredIds.includes(selectedMasterId) || isLoadingFusion}
            onClick={handleConfirm}
          >
            {isLoadingFusion ? 'Fusion en cours...' : 'Confirmer la fusion'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
