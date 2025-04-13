import TrackDetailView from '@/components/admin/TrackDetailView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Page de détail réelle (fallback pour l'interception)

interface MusicDetailPageProps {
  params: { id: string };
}

export default async function AdminMusicDetailPage({ params }: MusicDetailPageProps) {
  // NOTE: Ce composant s'affiche si on accède directement à l'URL
  // ou si on rafraîchit la page pendant que la modale est ouverte.
  // L'interception se fait via /admin/@modal/(...)music/[id]/detail/page.tsx

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Ajouter un lien retour ici aussi pour la cohérence */}
        <div className="mb-6">
          <Link
            href="/admin/music" // Retour à la liste musique
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour à la liste
          </Link>
        </div>

        {/* Afficher la vue détail directement, sans modale */}
        <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6 md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-black/30 opacity-50"></div>
          <TrackDetailView trackId={await params.id} />
        </div>
      </div>
    </div>
  );
}
