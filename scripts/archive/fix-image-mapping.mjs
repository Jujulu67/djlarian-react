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
 * Trouve le fichier correspondant à un imageId dans public/uploads/
 */
function findImageFile(imageId) {
  if (!imageId) return null;

  // Si c'est une URL complète, la garder telle quelle
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return imageId;
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  // Chercher avec différentes extensions
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const ext of extensions) {
    const filePath = path.join(uploadsDir, `${imageId}${ext}`);
    if (fs.existsSync(filePath)) {
      return `${imageId}${ext}`;
    }
  }

  return null;
}

/**
 * Liste tous les fichiers dans public/uploads/
 */
function getAllUploadedFiles() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    return [];
  }

  const files = fs.readdirSync(uploadsDir);
  return files
    .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
    .map((file) => file.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''))
    .filter((file) => !file.endsWith('-ori')); // Exclure les fichiers -ori
}

async function main() {
  try {
    console.log('🔍 Analyse des correspondances imageId <-> fichiers...\n');

    // Récupérer tous les events avec imageId
    const events = await prisma.event.findMany({
      where: { imageId: { not: null } },
      select: { id: true, title: true, imageId: true },
    });

    // Récupérer tous les tracks avec imageId
    const tracks = await prisma.track.findMany({
      where: { imageId: { not: null } },
      select: { id: true, title: true, imageId: true },
    });

    console.log(`📊 Événements avec imageId: ${events.length}`);
    console.log(`📊 Tracks avec imageId: ${tracks.length}\n`);

    // Lister tous les fichiers uploadés
    const uploadedFiles = getAllUploadedFiles();
    console.log(`📁 Fichiers dans public/uploads/: ${uploadedFiles.length}\n`);

    // Vérifier les correspondances pour les events
    console.log('🔍 Vérification des événements:');
    let eventsNotFound = 0;
    let eventsFound = 0;

    for (const event of events) {
      const file = findImageFile(event.imageId);
      if (file) {
        eventsFound++;
        console.log(`  ✅ ${event.title}: ${event.imageId} -> ${file}`);
      } else {
        eventsNotFound++;
        console.log(`  ❌ ${event.title}: ${event.imageId} (fichier non trouvé)`);
      }
    }

    console.log(`\n📊 Résumé événements: ${eventsFound} trouvés, ${eventsNotFound} non trouvés\n`);

    // Vérifier les correspondances pour les tracks
    console.log('🔍 Vérification des tracks:');
    let tracksNotFound = 0;
    let tracksFound = 0;

    for (const track of tracks) {
      // Les tracks avec URLs YouTube sont OK
      if (track.imageId.startsWith('http://') || track.imageId.startsWith('https://')) {
        tracksFound++;
        console.log(`  ✅ ${track.title}: URL externe`);
        continue;
      }

      const file = findImageFile(track.imageId);
      if (file) {
        tracksFound++;
        console.log(`  ✅ ${track.title}: ${track.imageId} -> ${file}`);
      } else {
        tracksNotFound++;
        console.log(`  ❌ ${track.title}: ${track.imageId} (fichier non trouvé)`);
      }
    }

    console.log(`\n📊 Résumé tracks: ${tracksFound} trouvés, ${tracksNotFound} non trouvés\n`);

    // Afficher les fichiers orphelins (fichiers sans correspondance dans la base)
    console.log('🔍 Fichiers orphelins (sans correspondance dans la base):');
    const allImageIds = new Set([...events.map((e) => e.imageId), ...tracks.map((t) => t.imageId)]);

    const orphanFiles = uploadedFiles.filter((file) => {
      // Vérifier si le fichier correspond à un imageId
      return !Array.from(allImageIds).some((imageId) => {
        if (!imageId || imageId.startsWith('http')) return false;
        return file === imageId || file.startsWith(imageId);
      });
    });

    if (orphanFiles.length > 0) {
      console.log(`  ⚠️  ${orphanFiles.length} fichiers orphelins trouvés:`);
      orphanFiles.slice(0, 10).forEach((file) => {
        console.log(`     - ${file}`);
      });
      if (orphanFiles.length > 10) {
        console.log(`     ... et ${orphanFiles.length - 10} autres`);
      }
    } else {
      console.log('  ✅ Aucun fichier orphelin');
    }

    console.log('\n✅ Analyse terminée');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
