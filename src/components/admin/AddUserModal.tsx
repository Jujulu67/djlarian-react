'use client';

import { useRouter } from 'next/navigation';

import AddUserForm from '@/components/admin/AddUserForm'; // Importer le formulaire
import Modal from '@/components/ui/Modal'; // Importer la modale générique

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
export default function AddUserModal({ userToEdit }: Readonly<AddUserModalProps>) {
  // Accepter la prop
  const router = useRouter();

  // Fermer la modale (route interceptée) puis rafraîchir la liste, sans délai arbitraire
  const handleSuccess = () => {
    router.back();
    router.refresh();
  };

  return (
    <Modal>
      <AddUserForm onSuccess={handleSuccess} userToEdit={userToEdit} />
    </Modal>
  );
}
