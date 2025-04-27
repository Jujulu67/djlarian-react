import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // 1. Vérifier l'utilisateur et son rôle
    const user = await prisma.user.findUnique({
      where: { email: 'juanzeiher@gmail.com' },
      include: {
        Account: true, // Changement ici: accounts -> Account
      },
    });

    console.log('\n1. Informations utilisateur :');
    console.log('--------------------------------');
    console.log('Email:', user?.email);
    console.log('Nom:', user?.name);
    console.log('Rôle:', user?.role);
    console.log('Mot de passe hashé existe:', !!user?.hashedPassword);

    // 2. Vérifier les méthodes de connexion disponibles
    console.log('\n2. Méthodes de connexion disponibles :');
    console.log('--------------------------------');
    if (user?.Account && user.Account.length > 0) {
      user.Account.forEach((account) => {
        console.log(`- ${account.provider} (ID: ${account.providerAccountId})`);
      });
    } else {
      console.log('Aucune méthode de connexion externe (Google, Twitch) trouvée');
      console.log('Seule la connexion par email/mot de passe est disponible');
    }

    // 3. Tester la connexion par mot de passe
    if (user?.hashedPassword) {
      console.log('\n3. Test de connexion par mot de passe :');
      console.log('--------------------------------');
      const testPassword = 'Larian2024!'; // Nouveau mot de passe
      const isValidPassword = await compare(testPassword, user.hashedPassword);
      console.log('Résultat de la validation du mot de passe:', isValidPassword);
      if (isValidPassword) {
        console.log('✅ Le mot de passe est correct !');
      } else {
        console.log('⚠️ Le mot de passe est incorrect');
      }
    }
  } catch (error) {
    console.error('Erreur lors du test :', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
