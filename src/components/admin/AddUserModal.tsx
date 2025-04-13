'use client';

import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal'; // Importer la modale générique
import AddUserForm from '@/components/admin/AddUserForm'; // Importer le formulaire

// Ce composant assemble la Modale et le Formulaire
export default function AddUserModal() {
  const router = useRouter();

  // Le callback onSuccess fermera la modale
  const handleSuccess = () => {
    router.back();
  };

  return (
    <Modal>
      <AddUserForm onSuccess={handleSuccess} />
    </Modal>
  );
}
