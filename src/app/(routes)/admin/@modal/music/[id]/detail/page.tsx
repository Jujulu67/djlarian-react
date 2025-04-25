'use client';

import Modal from '@/components/ui/Modal';
import TrackDetailView from '@/components/admin/TrackDetailView';
import { useRouter, useParams } from 'next/navigation';
import React from 'react';

export default function InterceptedMusicDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const trackId = params.id;

  if (!trackId) {
    console.error('Track ID not found in params');
    return null;
  }

  return (
    <Modal zClass="z-[9999]">
      <TrackDetailView trackId={trackId} onClose={() => router.back()} />
    </Modal>
  );
}
