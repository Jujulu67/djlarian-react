import React from 'react';
import Modal from '@/components/ui/Modal';
import TrackDetailView from '@/components/admin/TrackDetailView';

interface InterceptedTrackDetailProps {
  params: Promise<{ id: string }>;
}

// Ce composant est maintenant dans le slot @modal avec un chemin plus explicite
export default function InterceptedAdminMusicDetailPageInModal({
  params,
}: InterceptedTrackDetailProps) {
  const resolvedParams = React.use(params);
  return (
    <Modal>
      <TrackDetailView trackId={resolvedParams.id} />
    </Modal>
  );
}
