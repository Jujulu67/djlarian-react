// Cette page s'affichera si l'utilisateur navigue directement vers /admin/users/add
// ou recharge la page lorsque la modale est ouverte (si l'interception est réactivée).
'use client'; // Nécessaire car AddUserModal est maintenant un client component simple

import AddUserModal from '@/components/admin/AddUserModal';

export default function AddUserPage() {
  // Affiche le composant AddUserModal qui contient maintenant <Modal><AddUserForm/></Modal>
  // Le rendu sera pleine page ici, mais la structure interne est la même.
  return <AddUserModal />;
}
