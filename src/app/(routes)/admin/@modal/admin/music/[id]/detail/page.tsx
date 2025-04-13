import Modal from '@/components/ui/Modal';
import TrackDetailView from '@/components/admin/TrackDetailView';

interface InterceptedTrackDetailProps {
  params: { id: string };
}

// Ce composant est maintenant dans le slot @modal avec un chemin plus explicite
export default function InterceptedAdminMusicDetailPageInModal({
  params,
}: InterceptedTrackDetailProps) {
  return (
    <Modal>
      <TrackDetailView trackId={params.id} />
    </Modal>
  );
}
