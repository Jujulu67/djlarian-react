'use client'; // Nécessaire pour les hooks et interactions

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit } from 'lucide-react'; // Importer les icônes nécessaires
import Link from 'next/link'; // Importer Link

interface UserActionsProps {
  userId: string;
  userName?: string | null; // Pour la confirmation
}

export default function UserActions({ userId, userName }: UserActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    // Confirmation simplifiée
    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.` // Message statique
    );

    if (!confirmation) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Une erreur inconnue est survenue lors de la suppression.' }));
        throw new Error(errorData.error || "Impossible de supprimer l'utilisateur.");
      }

      // Succès : Rafraîchir les données de la page
      router.refresh();
      // Optionnel : Afficher une notification de succès (peut être fait avec une librairie de toasts)
      console.log('Utilisateur supprimé avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.message || 'Une erreur est survenue.');
      // Optionnel : Afficher une notification d'erreur
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-x-2 flex items-center">
      <Link
        href={`/admin/users/${userId}/edit`}
        className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center px-2 py-1 rounded hover:bg-indigo-900/30"
        aria-label="Modifier l'utilisateur"
      >
        <Edit className="h-4 w-4 mr-1" /> Modifier
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-wait inline-flex items-center px-2 py-1 rounded hover:bg-red-900/30"
        aria-label="Supprimer l'utilisateur"
      >
        <Trash2 className="h-4 w-4 mr-1" /> {isDeleting ? 'Suppression...' : 'Supprimer'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
