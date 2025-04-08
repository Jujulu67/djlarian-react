import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('votre_mot_de_passe', 12);

  const user = await prisma.user.create({
    data: {
      email: 'juanzeiher@gmail.com',
      name: 'DJ Larian',
      hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Administrateur créé:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
