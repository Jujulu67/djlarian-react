'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal'; // Importer la modale générique
import AddUserForm from '@/components/admin/AddUserForm'; // Importer le formulaire

// Ce composant assemble la Modale et le Formulaire
export default function AddUserModal() {
  const router = useRouter();

  // Le callback onSuccess rafraîchira explicitement les données avant de fermer la modale
  const handleSuccess = () => {
    // Rafraîchir les données explicitement avant la navigation
    router.refresh();

    // Petit délai pour permettre au rafraîchissement de se propager
    setTimeout(() => {
      router.back();
    }, 300);
  };

  return (
    <Modal>
      <AddUserForm onSuccess={handleSuccess} />
    </Modal>
  );
}
