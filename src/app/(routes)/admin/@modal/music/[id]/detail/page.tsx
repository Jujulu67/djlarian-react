'use client';

import { useRouter, useParams } from 'next/navigation';
import React from 'react';

import TrackDetailView from '@/components/admin/TrackDetailView';
import Modal from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

export default function InterceptedMusicDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const trackId = params.id;

  if (!trackId) {
    logger.error('Track ID not found in params');
    return null;
  }

  return (
    <Modal zClass="z-[9999]">
      <TrackDetailView trackId={trackId} onClose={() => router.back()} />
    </Modal>
  );
}
