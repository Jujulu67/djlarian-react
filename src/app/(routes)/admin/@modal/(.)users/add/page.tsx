'use client';

import AddUserModal from '@/components/admin/AddUserModal';

// Ce composant est rendu dans le slot @modal lorsque l'on navigue
// vers /admin/users/add *depuis* une autre page admin (comme /admin/users).
export default function InterceptedAddUserPage() {
  return <AddUserModal />;
}
