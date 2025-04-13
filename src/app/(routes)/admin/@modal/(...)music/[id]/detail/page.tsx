'use client';

import Modal from '@/components/ui/Modal';
import TrackDetailView from '@/components/admin/TrackDetailView';
import { useRouter } from 'next/navigation';

interface InterceptedMusicDetailPageProps {
  params: { id: string };
}

export default function InterceptedMusicDetailPage({ params }: InterceptedMusicDetailPageProps) {
  const router = useRouter();

  // Optionnel: ajouter une fonction pour fermer explicitement si besoin
  // const handleClose = () => router.back();

  return (
    <Modal>
      <TrackDetailView trackId={params.id} onClose={() => router.back()} />
    </Modal>
  );
}
