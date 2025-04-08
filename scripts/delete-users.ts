import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllUsers() {
  try {
    // D'abord supprimer toutes les sessions et comptes liés
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();

    // Ensuite supprimer tous les utilisateurs
    const deletedUsers = await prisma.user.deleteMany();

    console.log('\nSuppression des utilisateurs effectuée !');
    console.log('--------------------------------');
    console.log("Nombre d'utilisateurs supprimés:", deletedUsers.count);
    console.log(
      '\n✅ La base de données est vide, vous pouvez maintenant créer un nouveau compte depuis le site.'
    );
  } catch (error) {
    console.error('Erreur lors de la suppression :', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllUsers();
