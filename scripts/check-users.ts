import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        Account: true,
      },
    });

    console.log('\nListe des utilisateurs :');
    console.log('--------------------------------');

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données');
    } else {
      users.forEach((user) => {
        console.log(`\nUtilisateur ${user.id} :`);
        console.log('- Nom:', user.name);
        console.log('- Email:', user.email);
        console.log('- Rôle:', user.role);
        console.log(
          '- Méthode de connexion:',
          user.Account.length > 0
            ? user.Account.map((acc) => acc.provider).join(', ')
            : 'Email/Mot de passe'
        );
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification :', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
