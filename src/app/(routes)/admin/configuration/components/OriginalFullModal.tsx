'use client';

import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import type { ImageMeta } from '@/app/api/admin/images/shared';

interface OriginalFullModalProps {
  image: ImageMeta;
  onClose: () => void;
}

export function OriginalFullModal({ image, onClose }: OriginalFullModalProps) {
  return (
    <Modal
      maxWidth="max-w-none"
      bgClass="bg-black/95 backdrop-blur-sm"
      borderClass="border-none"
      zClass="z-[10000]"
      onClose={onClose}
      fullscreenContent
    >
      <div className="w-screen h-screen flex items-center justify-center p-0 m-0">
        <Image
          src={image.url}
          alt={image.name}
          fill
          className="max-w-full max-h-full object-contain"
          style={{ display: 'block' }}
          aria-label="Image originale en grand"
          unoptimized
        />
      </div>
    </Modal>
  );
}

