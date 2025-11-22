import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

/**
 * Nettoie les imageId pour qu'ils ne contiennent que le nom de fichier
 * sans le chemin /uploads/ ni l'extension
 */
function cleanImageId(imageId) {
  if (!imageId) return null;

  // Si c'est déjà une URL complète (http/https), la garder telle quelle
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return imageId;
  }

  // Enlever le préfixe /uploads/ s'il existe
  let cleaned = imageId.replace(/^\/uploads\//, '');

  // Enlever l'extension .jpg, .jpeg, .png, etc.
  cleaned = cleaned.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

  return cleaned;
}

async function main() {
  try {
    console.log('🧹 Nettoyage des imageId dans la base de données...\n');

    // Nettoyer les Events
    const events = await prisma.event.findMany({
      where: { imageId: { not: null } },
      select: { id: true, title: true, imageId: true },
    });

    let eventsUpdated = 0;
    for (const event of events) {
      const cleanedId = cleanImageId(event.imageId);
      if (cleanedId !== event.imageId) {
        await prisma.event.update({
          where: { id: event.id },
          data: { imageId: cleanedId },
        });
        console.log(`  ✅ Event "${event.title}": "${event.imageId}" → "${cleanedId}"`);
        eventsUpdated++;
      }
    }

    // Nettoyer les Tracks
    const tracks = await prisma.track.findMany({
      where: { imageId: { not: null } },
      select: { id: true, title: true, imageId: true },
    });

    let tracksUpdated = 0;
    for (const track of tracks) {
      const cleanedId = cleanImageId(track.imageId);
      if (cleanedId !== track.imageId) {
        await prisma.track.update({
          where: { id: track.id },
          data: { imageId: cleanedId },
        });
        console.log(`  ✅ Track "${track.title}": "${track.imageId}" → "${cleanedId}"`);
        tracksUpdated++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`  - ${eventsUpdated} Events mis à jour`);
    console.log(`  - ${tracksUpdated} Tracks mis à jour`);
    console.log(`\n✅ Nettoyage terminé !`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
