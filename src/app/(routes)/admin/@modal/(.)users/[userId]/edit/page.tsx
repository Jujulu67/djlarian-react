export const runtime = 'edge';
import AddUserModal from '@/components/admin/AddUserModal';
import ErrorModal from '@/components/ui/ErrorModal';
import prisma from '@/lib/prisma';
import { User } from '@prisma/client';

interface EditUserModalPageProps {
  params: Promise<{
    userId: string;
  }>;
}

async function getUserData(userId: string): Promise<User | null> {
  if (!userId || typeof userId !== 'string' || userId.length < 5) {
    console.error('ID utilisateur invalide fourni:', userId);
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error("Erreur Prisma lors de la récupération de l'utilisateur:", error);
    return null;
  }
}

export default async function InterceptedEditUserPage({ params }: EditUserModalPageProps) {
  const resolvedParams = await params;
  const user = await getUserData(resolvedParams.userId);

  if (!user) {
    return (
      <ErrorModal
        title="Utilisateur Introuvable"
        message={`Impossible de charger les informations pour l'utilisateur avec l'ID : ${resolvedParams.userId}. Peut-être a-t-il été supprimé ou l'ID est incorrect.`}
        backHref="/admin/users"
        backButtonLabel="Retour à la liste"
      />
    );
  }

  // Créer un objet correspondant à l'interface User locale attendue par AddUserModal
  const userForModal: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    isVip: boolean;
  } = {
    id: user.id,
    email: user.email ?? 'N/A', // Fournir une valeur par défaut si null
    name: user.name,
    role: user.role ?? 'USER', // Fournir une valeur par défaut si null
    isVip: (user as any).isVip ?? false, // Utiliser une assertion de type
  };

  return <AddUserModal userToEdit={userForModal} />;
}
