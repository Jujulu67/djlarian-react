'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal'; // Importer la modale générique
import AddUserForm from '@/components/admin/AddUserForm'; // Importer le formulaire

// Rétablir l'interface locale (identique à AddUserForm)
interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isVip: boolean;
}

interface AddUserModalProps {
  // Utiliser l'interface locale User
  userToEdit?: User;
}

// Ce composant assemble la Modale et le Formulaire
export default function AddUserModal({ userToEdit }: AddUserModalProps) {
  // Accepter la prop
  const router = useRouter();

  // Le callback onSuccess rafraîchira explicitement les données avant de fermer la modale
  const handleSuccess = () => {
    console.log('AddUserModal: handleSuccess appelé.'); // Log pour vérifier
    router.refresh();
    console.log('AddUserModal: router.refresh() appelé.'); // Log

    // Augmenter le délai
    setTimeout(() => {
      console.log('AddUserModal: setTimeout terminé, appel de router.back().'); // Log
      router.back();
    }, 800); // Essayer 800ms au lieu de 300ms
  };

  return (
    <Modal>
      <AddUserForm onSuccess={handleSuccess} userToEdit={userToEdit} />
    </Modal>
  );
}
