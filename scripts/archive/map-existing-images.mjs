import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

/**
 * Liste tous les fichiers images dans public/uploads/ (sans -ori)
 */
function getAllImageFiles() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    return [];
  }

  const files = fs.readdirSync(uploadsDir);
  return files
    .filter((file) => {
      // Exclure les fichiers -ori
      if (file.includes('-ori.')) return false;
      // Inclure seulement les images
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
    })
    .map((file) => file.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''));
}

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function main() {
  try {
    console.log('🖼️  Mapping des images existantes aux tracks et événements...\n');

    // Récupérer toutes les images disponibles
    const availableImages = getAllImageFiles();
    console.log(`📁 Images disponibles: ${availableImages.length}`);

    // Récupérer tous les tracks et events
    const tracks = await prisma.track.findMany({
      select: { id: true, title: true, imageId: true },
      orderBy: { createdAt: 'desc' },
    });

    const events = await prisma.event.findMany({
      select: { id: true, title: true, imageId: true },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`🎵 Tracks: ${tracks.length}`);
    console.log(`📅 Événements: ${events.length}\n`);

    // Mélanger les images
    const shuffledImages = shuffle(availableImages);

    // Calculer combien d'items on va laisser vides (environ 30%)
    const totalItems = tracks.length + events.length;
    const itemsToFill = Math.floor(totalItems * 0.7); // 70% avec images
    const imagesToUse = shuffledImages.slice(0, itemsToFill);

    console.log(
      `📊 Stratégie: ${itemsToFill} items avec images, ${totalItems - itemsToFill} vides\n`
    );

    // Mélanger tracks et events ensemble pour une distribution aléatoire
    const allItems = [
      ...tracks.map((t) => ({ type: 'track', ...t })),
      ...events.map((e) => ({ type: 'event', ...e })),
    ];
    const shuffledItems = shuffle(allItems);

    // Assigner les images
    let assigned = 0;
    let leftEmpty = 0;

    for (let i = 0; i < shuffledItems.length; i++) {
      const item = shuffledItems[i];
      const shouldHaveImage = i < imagesToUse.length;

      if (shouldHaveImage && imagesToUse[i]) {
        const imageId = imagesToUse[i];

        if (item.type === 'track') {
          await prisma.track.update({
            where: { id: item.id },
            data: { imageId },
          });
          console.log(`  ✅ Track "${item.title}": ${imageId}`);
          assigned++;
        } else {
          await prisma.event.update({
            where: { id: item.id },
            data: { imageId },
          });
          console.log(`  ✅ Event "${item.title}": ${imageId}`);
          assigned++;
        }
      } else {
        // Laisser vide (ou mettre à null si déjà une image)
        if (item.imageId && !item.imageId.startsWith('http')) {
          if (item.type === 'track') {
            await prisma.track.update({
              where: { id: item.id },
              data: { imageId: null },
            });
            console.log(`  ⚪ Track "${item.title}": vidé`);
          } else {
            await prisma.event.update({
              where: { id: item.id },
              data: { imageId: null },
            });
            console.log(`  ⚪ Event "${item.title}": vidé`);
          }
          leftEmpty++;
        } else {
          console.log(
            `  ⚪ ${item.type === 'track' ? 'Track' : 'Event'} "${item.title}": déjà vide`
          );
          leftEmpty++;
        }
      }
    }

    console.log(`\n✅ Mapping terminé:`);
    console.log(`   - ${assigned} images assignées`);
    console.log(`   - ${leftEmpty} items laissés vides`);
    console.log(`   - ${availableImages.length - assigned} images non utilisées`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
