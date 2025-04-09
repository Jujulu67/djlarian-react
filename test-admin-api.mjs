import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

    // 2. Essayer une authentification via le formulaire NextAuth
    console.log("\nCréation d'une session avec NextAuth...");

    // Créer un événement directement via Prisma
    console.log("\nCréation d'un événement de test...");
    const event = await prisma.event.create({
      data: {
        title: 'Événement test pour la récurrence',
        description: "Description de l'événement de test",
        location: 'Lieu de test',
        startDate: new Date('2025-05-01T10:00:00Z'),
        endDate: new Date('2025-05-01T12:00:00Z'),
        isPublished: true,
        status: 'UPCOMING',
        userId: adminUser.id,
        tickets: {
          create: {
            price: 25,
            currency: 'EUR',
            buyUrl: 'http://example.com/tickets',
            quantity: 100,
          },
        },
      },
    });

    console.log('Événement créé:', event.id);

    // 3. Mettre à jour l'événement avec la récurrence via l'API
    const updateResponse = await fetch(`http://localhost:3000/api/events/${event.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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

    console.log('Statut de mise à jour via API:', updateResponse.status);
    const updateResult = await updateResponse.text();
    console.log('Résultat API:', updateResult);

    // 4. Mettre à jour directement avec Prisma
    console.log('\nMise à jour directe avec Prisma...');

    // Créer configuration de récurrence
    const recurrenceConfig = await prisma.recurrenceConfig.create({
      data: {
        frequency: 'weekly',
        endDate: new Date('2025-06-08T20:38:45.805Z'),
        excludedDates: [],
        event: {
          connect: { id: event.id },
        },
      },
    });

    console.log('Configuration de récurrence créée:', recurrenceConfig.id);

    // Vérifier que l'événement a bien la configuration de récurrence
    const updatedEvent = await prisma.event.findUnique({
      where: { id: event.id },
      include: {
        recurrenceConfig: true,
        tickets: true,
      },
    });

    console.log(
      'Événement mis à jour:',
      JSON.stringify(
        updatedEvent,
        (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        },
        2
      )
    );
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
