// Ce script permet de nettoyer les images orphelines dans le dossier uploads
// Il identifie les images qui ne sont pas référencées dans la base de données
// Il peut également convertir les data URL en fichiers physiques

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

async function getReferencedImages() {
  // Récupérer toutes les URLs d'images de la base de données
  const events = await prisma.event.findMany({
    select: {
      id: true,
      image: true,
      originalImageUrl: true,
    },
  });

  const referencedImages = new Set();
  const dataUrlEvents = [];

  // Collecter toutes les URLs d'images (normale et originale)
  events.forEach((event) => {
    console.log(
      `Événement ${event.id}: image=${event.image || 'non définie'}, originalImageUrl=${
        event.originalImageUrl
          ? event.originalImageUrl.startsWith('data:')
            ? 'data URL (longue)'
            : event.originalImageUrl
          : 'non définie'
      }`
    );

    if (event.image) {
      // Extraire le nom du fichier depuis l'URL
      const filename = event.image.split('/').pop();
      if (filename) referencedImages.add(filename);
    }

    // Vérifier s'il s'agit d'une data URL ou d'une URL normale
    if (event.originalImageUrl) {
      if (event.originalImageUrl.startsWith('/uploads/')) {
        // C'est une URL normale, extraire le nom du fichier
        const filename = event.originalImageUrl.split('/').pop();
        if (filename) referencedImages.add(filename);
      } else if (event.originalImageUrl.startsWith('data:image/')) {
        // C'est une data URL, marquer pour conversion potentielle
        dataUrlEvents.push(event);
      }
    }
  });

  return { referencedImages, dataUrlEvents };
}

// Convertir une data URL en fichier physique
async function convertDataUrlToFile(eventId, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return null;
  }

  try {
    // Extraire le type MIME et les données
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      console.error(`❌ Format de data URL invalide pour l'événement ${eventId}`);
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType.split('/')[1] || 'jpg';

    // Créer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `event-${uniqueSuffix}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Convertir et enregistrer le fichier
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`✓ Data URL convertie en fichier pour l'événement ${eventId}: ${filename}`);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la conversion de la data URL pour l'événement ${eventId}:`,
      error.message
    );
    return null;
  }
}

async function cleanupDataUrls() {
  console.log('🔍 Recherche de data URLs à convertir en fichiers...');

  const { dataUrlEvents } = await getReferencedImages();

  if (dataUrlEvents.length === 0) {
    console.log('✅ Aucune data URL à convertir trouvée.');
    return;
  }

  console.log(`🔄 Conversion de ${dataUrlEvents.length} data URLs en fichiers...`);

  for (const event of dataUrlEvents) {
    if (!event.originalImageUrl || !event.originalImageUrl.startsWith('data:image/')) {
      continue;
    }

    const newUrl = await convertDataUrlToFile(event.id, event.originalImageUrl);

    if (newUrl) {
      // Mettre à jour la base de données
      await prisma.event.update({
        where: { id: event.id },
        data: { originalImageUrl: newUrl },
      });

      console.log(`✓ Base de données mise à jour pour l'événement ${event.id}`);
    }
  }

  console.log('✅ Conversion des data URLs terminée.');
}

async function cleanupOrphanedFiles() {
  console.log('🔍 Analyse des images utilisées dans la base de données...');

  try {
    // Obtenir les images référencées dans la base de données
    const { referencedImages } = await getReferencedImages();

    console.log(`📊 Images référencées dans la base de données: ${referencedImages.size}`);

    // Lire le contenu du répertoire uploads
    const files = fs.readdirSync(uploadsDir);

    console.log(`📁 Fichiers présents dans le dossier uploads: ${files.length}`);

    // Identifier les fichiers orphelins
    const orphanedFiles = files.filter((file) => !referencedImages.has(file));

    console.log(`🗑️ Images orphelines trouvées: ${orphanedFiles.length}`);

    // Option pour supprimer les fichiers
    if (process.argv.includes('--delete')) {
      console.log('🚮 Suppression des images orphelines...');

      let deletedCount = 0;
      for (const file of orphanedFiles) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          deletedCount++;
          console.log(`✓ Supprimé: ${file}`);
        } catch (error) {
          console.error(`❌ Erreur lors de la suppression de ${file}:`, error.message);
        }
      }

      console.log(`✅ ${deletedCount}/${orphanedFiles.length} images orphelines supprimées.`);
    } else {
      // Afficher uniquement la liste des fichiers orphelins sans supprimer
      console.log('📋 Liste des images orphelines (utilisez --delete pour les supprimer):');
      orphanedFiles.forEach((file) => console.log(` - ${file}`));
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

async function cleanup() {
  try {
    // Convertir d'abord les data URLs si l'option est activée
    if (process.argv.includes('--convert-dataurls')) {
      await cleanupDataUrls();
    }

    // Ensuite nettoyer les fichiers orphelins
    await cleanupOrphanedFiles();
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage global:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Afficher un peu d'aide
if (process.argv.includes('--help')) {
  console.log(`
Usage: node cleanup_images.js [options]

Options:
  --delete             Supprimer les images orphelines
  --convert-dataurls   Convertir les data URLs en fichiers physiques
  --help               Afficher cette aide
  
Exemples:
  node cleanup_images.js             Liste les images orphelines
  node cleanup_images.js --delete    Supprime les images orphelines
  node cleanup_images.js --convert-dataurls   Convertit les data URLs en fichiers
  node cleanup_images.js --convert-dataurls --delete   Fait les deux opérations
  `);
  process.exit(0);
}

cleanup();
