// Cette page s'affichera si l'utilisateur navigue directement vers /admin/music/[id]/detail
// ou recharge la page lorsque la modale est ouverte.
'use client';

import { useRouter, useParams } from 'next/navigation';

import TrackDetailView from '@/components/admin/TrackDetailView';
import Modal from '@/components/ui/Modal';

export default function MusicDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  if (!params.id) {
    return null;
  }

  return (
    <Modal zClass="z-[9999]">
      <TrackDetailView trackId={params.id} onClose={() => router.push('/admin/music')} />
    </Modal>
  );
}
