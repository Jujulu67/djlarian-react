import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'juanzeiher@gmail.com' },
    });
    console.log('User found:', user);

    const allUsers = await prisma.user.findMany();
    console.log('Total users:', allUsers.length);
    console.log('Admin users:', allUsers.filter((u) => u.role === 'ADMIN').length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
