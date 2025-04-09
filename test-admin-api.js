const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Vérifier si un utilisateur admin existe déjà ou en créer un
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      console.log("Création d'un utilisateur administrateur...");
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log(
        "Utilisateur administrateur créé avec l'email: admin@example.com et mot de passe: admin123"
      );
    } else {
      console.log('Utilisateur administrateur trouvé:', adminUser.email);
    }

    // 2. Tester la connexion pour obtenir un token
    console.log("\nConnexion en tant qu'administrateur...");
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'admin123',
        redirect: false,
        json: true,
      }),
    });

    console.log('Statut de connexion:', loginResponse.status);

    // 3. Tester la mise à jour d'un événement avec la récurrence
    console.log('\nRécupération de la liste des événements...');
    const eventsResponse = await fetch('http://localhost:3000/api/events');
    const events = await eventsResponse.json();

    if (events && events.length > 0) {
      const eventId = events[0].id;
      console.log(`Mise à jour de l'événement: ${eventId}`);

      const updateResponse = await fetch(`http://localhost:3000/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: loginResponse.headers.get('set-cookie') || '',
        },
        body: JSON.stringify({
          title: 'Événement avec récurrence',
          recurrence: {
            isRecurring: true,
            frequency: 'weekly',
            endDate: '2025-06-08T20:38:45.805Z',
          },
        }),
      });

      console.log('Statut de mise à jour:', updateResponse.status);
      const updateData = await updateResponse.json();
      console.log('Résultat:', JSON.stringify(updateData, null, 2));
    } else {
      console.log('Aucun événement trouvé à mettre à jour');
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
