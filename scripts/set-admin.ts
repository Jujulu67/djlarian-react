import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdmin() {
  try {
    const updatedUser = await prisma.user.update({
      where: { email: 'djlarian@gmail.com' },
      data: { role: 'ADMIN' },
    });

    console.log('\nUtilisateur promu administrateur !');
    console.log('--------------------------------');
    console.log('- Nom:', updatedUser.name);
    console.log('- Email:', updatedUser.email);
    console.log('- Nouveau rôle:', updatedUser.role);
    console.log('\n✅ Vous avez maintenant accès au panel administrateur !');
  } catch (error) {
    console.error('Erreur lors de la promotion :', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
