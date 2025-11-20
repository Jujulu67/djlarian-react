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
 * Vérifie si un fichier existe pour un imageId
 */
function imageFileExists(imageId) {
  if (!imageId) return false;
  
  // Les URLs externes sont toujours valides
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return true;
  }
  
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  for (const ext of extensions) {
    const filePath = path.join(uploadsDir, `${imageId}${ext}`);
    if (fs.existsSync(filePath)) {
      return true;
    }
  }
  
  return false;
}

async function main() {
  try {
    console.log('🔍 Recherche des imageId sans fichier correspondant...\n');
    
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
    
    console.log(`📊 Événements à vérifier: ${events.length}`);
    console.log(`📊 Tracks à vérifier: ${tracks.length}\n`);
    
    // Vérifier et corriger les events
    let eventsFixed = 0;
    console.log('🔍 Vérification des événements:');
    for (const event of events) {
      if (!imageFileExists(event.imageId)) {
        console.log(`  ❌ ${event.title}: ${event.imageId} -> NULL`);
        await prisma.event.update({
          where: { id: event.id },
          data: { imageId: null },
        });
        eventsFixed++;
      }
    }
    
    // Vérifier et corriger les tracks
    let tracksFixed = 0;
    console.log('\n🔍 Vérification des tracks:');
    for (const track of tracks) {
      if (!imageFileExists(track.imageId)) {
        console.log(`  ❌ ${track.title}: ${track.imageId} -> NULL`);
        await prisma.track.update({
          where: { id: track.id },
          data: { imageId: null },
        });
        tracksFixed++;
      }
    }
    
    console.log(`\n✅ Correction terminée:`);
    console.log(`   - ${eventsFixed} événements corrigés`);
    console.log(`   - ${tracksFixed} tracks corrigés`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

