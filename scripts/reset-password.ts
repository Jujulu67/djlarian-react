import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    // Mot de passe générique
    const newPassword = 'Larian2024!';
    const hashedPassword = await hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { email: 'juanzeiher@gmail.com' },
      data: { hashedPassword },
    });

    console.log('\nMot de passe réinitialisé avec succès !');
    console.log('--------------------------------');
    console.log('Email:', updatedUser.email);
    console.log('Nouveau mot de passe:', newPassword);
    console.log('\n⚠️ Notez bien ce mot de passe, vous en aurez besoin pour vous connecter !');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation :', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
