'use client'; // Nécessaire pour useRouter

import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation'; // Importer useRouter
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'; // Ajouter ArrowLeft
import Image from 'next/image';

interface ErrorModalProps {
  title?: string;
  message?: string;
  imageUrl?: string;
  backHref?: string; // URL de retour optionnelle
  backButtonLabel?: string; // Label du bouton de retour optionnel
}

export default function ErrorModal({
  title = "Oops ! Quelque chose s'est mal passé...",
  message = 'Une erreur inattendue est survenue. Rassurez-vous, tout est sous contrôle (normalement).',
  imageUrl = 'https://placehold.co/300x200?text=Image+Rigolote+%3AP&font=Lille',
  backHref, // Récupérer la prop
  backButtonLabel = 'Retour', // Label par défaut
}: ErrorModalProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back(); // Comportement par défaut : retour à la page précédente
    }
  };

  return (
    <Modal>
      <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-800 rounded-lg shadow-xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />

        <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>

        <p className="text-gray-300 mb-6">{message}</p>

        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Illustration d'erreur humoristique"
            width={300}
            height={200}
            unoptimized
            className="max-w-xs rounded-md mb-6 shadow-lg"
          />
        )}

        {/* Remplacer Link par Button */}
        <button
          onClick={handleBackClick} // Utiliser le handler
          className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors shadow-md"
        >
          {/* Utiliser une icône plus générique comme 'Retour' */}
          <ArrowLeft className="h-5 w-5 mr-2" />
          {backButtonLabel} {/* Utiliser le label dynamique */}
        </button>
      </div>
    </Modal>
  );
}
