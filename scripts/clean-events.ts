import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanEvents() {
  try {
    console.log('🧹 Nettoyage de la base de données des événements en cours...');

    // Supprimer d'abord les dépendances pour éviter les contraintes de clé étrangère
    console.log('1️⃣ Suppression des configurations de récurrence...');
    const deletedRecurrenceConfigs = await prisma.recurrenceConfig.deleteMany();
    console.log(`✅ ${deletedRecurrenceConfigs.count} configuration(s) de récurrence supprimée(s)`);

    console.log('2️⃣ Suppression des tickets...');
    const deletedTickets = await prisma.ticketInfo.deleteMany();
    console.log(`✅ ${deletedTickets.count} ticket(s) supprimé(s)`);

    console.log('3️⃣ Suppression des événements...');
    const deletedEvents = await prisma.event.deleteMany();
    console.log(`✅ ${deletedEvents.count} événement(s) supprimé(s)`);

    console.log('🎉 Nettoyage terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la base de données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
cleanEvents();
