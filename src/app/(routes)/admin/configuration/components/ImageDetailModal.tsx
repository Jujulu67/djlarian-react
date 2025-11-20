'use client';

import Image from 'next/image';
import { Download, Music, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { GroupedImage } from '../types';
import type { ImageMeta } from '@/app/api/admin/images/shared';

interface ImageDetailModalProps {
  selectedGroup: GroupedImage;
  onClose: () => void;
  onDownload: (image: ImageMeta) => void;
  onShowOriginalFull: () => void;
}

export function ImageDetailModal({
  selectedGroup,
  onClose,
  onDownload,
  onShowOriginalFull,
}: ImageDetailModalProps) {
  return (
    <Modal
      maxWidth="max-w-5xl"
      showLoader={false}
      bgClass="bg-gradient-to-br from-gray-900 to-gray-800"
      borderClass="border-purple-500/30"
      onClose={onClose}
    >
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-6">
          {/* Crop */}
          {selectedGroup.crop && (
            <div className="flex flex-col items-center w-full max-w-[400px]">
              <div
                className="relative w-full"
                style={{ aspectRatio: '1 / 1', maxWidth: 400, height: 'auto' }}
              >
                <Image
                  src={selectedGroup.crop.url}
                  alt={selectedGroup.crop.name}
                  fill
                  className="absolute inset-0 w-full h-full rounded-lg object-cover border-2 border-purple-700 shadow-lg"
                  unoptimized
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded-lg px-3 py-1 opacity-90 group-hover:opacity-100 transition-all z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDownload(selectedGroup.crop!)}
                    aria-label="Télécharger Crop"
                    className="text-purple-300 hover:bg-purple-900/40"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-purple-300 font-semibold mt-2">Crop</div>
              <div className="text-xs text-purple-200 mt-1">
                {(selectedGroup.crop.size / 1024).toFixed(1)} Ko
              </div>
            </div>
          )}
          {/* Originale */}
          {selectedGroup.ori && (
            <div className="flex flex-col items-center w-full max-w-[400px]">
              <div
                className="relative w-full flex items-center justify-center"
                style={{ aspectRatio: '1 / 1', maxWidth: 400, height: 'auto' }}
              >
                <Image
                  src={selectedGroup.ori.url}
                  alt={selectedGroup.ori.name}
                  fill
                  className="rounded-lg object-contain border-2 border-blue-700 shadow-lg cursor-zoom-in"
                  onClick={onShowOriginalFull}
                  tabIndex={0}
                  aria-label="Afficher l'originale en grand"
                  unoptimized
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded-lg px-3 py-1 opacity-90 group-hover:opacity-100 transition-all z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDownload(selectedGroup.ori!)}
                    aria-label="Télécharger Originale"
                    className="text-blue-300 hover:bg-blue-900/40"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-blue-300 font-semibold mt-2">Originale</div>
              <div className="text-xs text-blue-200 mt-1">
                {(selectedGroup.ori.size / 1024).toFixed(1)} Ko
              </div>
            </div>
          )}
        </div>
        {/* Infos détaillées sous les images */}
        <div className="w-full flex flex-col items-center mb-6">
          <div className="flex flex-row gap-8 w-full max-w-2xl justify-center">
            <div className="flex-1 min-w-0">
              <div
                className="text-white font-mono text-base truncate text-center"
                title={selectedGroup.crop?.name || selectedGroup.ori?.name}
              >
                {selectedGroup.crop?.name || selectedGroup.ori?.name}
              </div>
              <div className="text-gray-400 text-xs text-center mt-1">
                {selectedGroup.crop
                  ? new Date(selectedGroup.crop.date).toLocaleString()
                  : selectedGroup.ori
                    ? new Date(selectedGroup.ori.date).toLocaleString()
                    : ''}
              </div>
            </div>
          </div>
        </div>
        {/* Badge de liaison */}
        {selectedGroup.linkedTo &&
          (() => {
            const linked = selectedGroup.linkedTo;
            return (
              <div className="w-full flex flex-col items-center mb-6 gap-3">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir la page liée à ${linked.title}`}
                  onClick={() => {
                    if (linked.type === 'track') {
                      window.open(`/admin/music?edit=${linked.id}`, '_blank');
                    } else {
                      window.open(`/admin/events/${linked.id}`, '_blank');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (linked.type === 'track') {
                        window.open(`/admin/music?edit=${linked.id}`, '_blank');
                      } else {
                        window.open(`/admin/events/${linked.id}`, '_blank');
                      }
                    }
                  }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg w-full max-w-xl justify-center transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 ${
                    linked.type === 'track'
                      ? 'bg-purple-700/30 text-purple-200 hover:bg-purple-700/60 hover:text-white hover:scale-[1.02] focus:ring-purple-400'
                      : 'bg-blue-700/30 text-blue-200 hover:bg-blue-700/60 hover:text-white hover:scale-[1.02] focus:ring-blue-400'
                  }`}
                  style={{ minHeight: '3rem' }}
                  title={linked.title}
                >
                  {linked.type === 'track' ? (
                    <Music className="w-6 h-6 flex-shrink-0" />
                  ) : (
                    <Calendar className="w-6 h-6 flex-shrink-0" />
                  )}
                  <span className="truncate">{linked.title}</span>
                </span>
              </div>
            );
          })()}
      </div>
    </Modal>
  );
}
