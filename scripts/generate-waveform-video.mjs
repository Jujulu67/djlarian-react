#!/usr/bin/env node

/**
 * Script pour générer la vidéo du gradient waveform animé
 *
 * Ce script crée une vidéo MP4 de 3 secondes avec un gradient horizontal animé
 * qui boucle parfaitement pour le waveform du hero.
 *
 * Prérequis: FFmpeg doit être installé
 * Installation: brew install ffmpeg (macOS) ou apt-get install ffmpeg (Linux)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const outputDir = join(projectRoot, 'public', 'videos');
const outputPath = join(outputDir, 'waveform-gradient.mp4');

// Vérifier si FFmpeg est installé
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Générer la vidéo avec FFmpeg
function generateVideo() {
  console.log('🎬 Génération de la vidéo du gradient waveform...\n');

  // Créer le dossier si nécessaire
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Dossier créé: ${outputDir}`);
  }

  // Spécifications
  const width = 1600; // 2x pour retina
  const height = 128; // 2x pour retina
  const duration = 2; // 2 secondes pour une boucle plus fluide et plus courte
  const fps = 60;

  // Pour une boucle parfaite (seamless loop), le gradient doit se déplacer exactement de 2x la largeur
  // La dernière frame doit être identique à la première frame
  // On utilise exactement 2*width pour garantir que mod(X + speed*duration, 2*width) = X à T=duration
  const gradientCycle = width * 2; // Le gradient complet fait 2x la largeur

  // Calculer le nombre exact de frames pour une boucle parfaite
  // Le gradient doit se déplacer de exactement gradientCycle pixels
  // Pour que la dernière frame soit identique à la première, on doit avoir:
  // gradientSpeed * duration = gradientCycle (exactement)
  const totalFrames = Math.floor(duration * fps); // Nombre exact de frames
  const actualDuration = totalFrames / fps; // Durée réelle basée sur les frames

  console.log(`📐 Dimensions: ${width}x${height}px`);
  console.log(
    `⏱️  Durée: ${actualDuration.toFixed(3)}s (${totalFrames} frames pour boucle parfaite)`
  );
  console.log(`🎞️  Frame rate: ${fps}fps\n`);

  try {
    // Créer la vidéo avec un gradient animé en boucle parfaite
    // Purple (#a855f7 = rgb(168, 85, 247)) → Blue (#3b82f6 = rgb(59, 130, 246)) → Purple
    // Pour une boucle parfaite, le gradient doit se déplacer exactement de 2x la largeur
    // La vitesse doit être calculée pour que la dernière frame soit identique à la première

    // Vitesse pour que le gradient se déplace de 2x la largeur en exactement 'actualDuration' secondes
    // Cela garantit que frame 0 = frame finale (boucle parfaite)
    // On utilise actualDuration (basé sur le nombre exact de frames) pour garantir la continuité
    const gradientSpeed = gradientCycle / actualDuration; // pixels par seconde

    // Formule optimisée pour une boucle parfaite (seamless)
    // On utilise mod() avec une période exacte pour garantir la continuité
    // À T=0: mod(X + 0, cycle) = X
    // À T=actualDuration: mod(X + speed*actualDuration, cycle) = mod(X + cycle, cycle) = X
    // Donc frame 0 = frame finale = boucle parfaite!
    const ffmpegCommand = `ffmpeg -f lavfi -i color=c=black:s=${width}x${height}:d=${actualDuration}:r=${fps} \
      -vf "geq=\
        r='if(lt(mod(X+${gradientSpeed}*T,${gradientCycle}),${width}),\
          168*(1-mod(X+${gradientSpeed}*T,${gradientCycle})/${width})+59*(mod(X+${gradientSpeed}*T,${gradientCycle})/${width}),\
          59*(1-(mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width})+168*((mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width}))':\
        g='if(lt(mod(X+${gradientSpeed}*T,${gradientCycle}),${width}),\
          85*(1-mod(X+${gradientSpeed}*T,${gradientCycle})/${width})+130*(mod(X+${gradientSpeed}*T,${gradientCycle})/${width}),\
          130*(1-(mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width})+85*((mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width}))':\
        b='if(lt(mod(X+${gradientSpeed}*T,${gradientCycle}),${width}),\
          247*(1-mod(X+${gradientSpeed}*T,${gradientCycle})/${width})+246*(mod(X+${gradientSpeed}*T,${gradientCycle})/${width}),\
          246*(1-(mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width})+247*((mod(X+${gradientSpeed}*T,${gradientCycle})-${width})/${width}))'" \
      -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
      -profile:v baseline -level 3.0 \
      -movflags +faststart \
      -vsync cfr \
      -pix_fmt yuv420p \
      -y "${outputPath}"`;

    console.log('⚙️  Génération en cours... (cela peut prendre quelques secondes)\n');
    execSync(ffmpegCommand, { stdio: 'inherit' });

    console.log(`\n✅ Vidéo générée avec succès!`);
    console.log(`📁 Fichier: ${outputPath}`);

    // Afficher la taille du fichier
    const stats = statSync(outputPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`📦 Taille: ${fileSizeInKB} KB\n`);
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération de la vidéo:');
    console.error(error.message);

    // Essayer une méthode alternative: créer des images PNG puis les convertir en vidéo
    console.log("\n🔄 Tentative avec génération d'images puis conversion en vidéo...\n");

    try {
      const tempDir = join(projectRoot, 'temp-waveform-frames');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      // Générer des frames PNG avec le gradient
      const numFrames = duration * fps;
      console.log(`📸 Génération de ${numFrames} frames...`);

      // Créer les frames avec FFmpeg
      const framesCommand = `ffmpeg -f lavfi -i color=c=black:s=${width}x${height}:d=${duration}:r=${fps} \
        -vf "geq=\
          r='if(lt(mod(X+${width}*T/${duration},${width}*2),${width}),\
            168*(1-mod(X+${width}*T/${duration},${width}*2)/${width})+59*(mod(X+${width}*T/${duration},${width}*2)/${width}),\
            59*(1-(mod(X+${width}*T/${duration},${width}*2)-${width})/${width})+168*((mod(X+${width}*T/${duration},${width}*2)-${width})/${width}))':\
          g='if(lt(mod(X+${width}*T/${duration},${width}*2),${width}),\
            85*(1-mod(X+${width}*T/${duration},${width}*2)/${width})+130*(mod(X+${width}*T/${duration},${width}*2)/${width}),\
            130*(1-(mod(X+${width}*T/${duration},${width}*2)-${width})/${width})+85*((mod(X+${width}*T/${duration},${width}*2)-${width})/${width}))':\
          b='if(lt(mod(X+${width}*T/${duration},${width}*2),${width}),\
            247*(1-mod(X+${width}*T/${duration},${width}*2)/${width})+246*(mod(X+${width}*T/${duration},${width}*2)/${width}),\
            246*(1-(mod(X+${width}*T/${duration},${width}*2)-${width})/${width})+247*((mod(X+${width}*T/${duration},${width}*2)-${width})/${width}))'" \
        -frames:v ${numFrames} \
        -y "${tempDir}/frame_%04d.png"`;

      execSync(framesCommand, { stdio: 'inherit' });

      // Convertir les frames en vidéo
      console.log(`\n🎬 Conversion des frames en vidéo...`);
      const videoCommand = `ffmpeg -framerate ${fps} -i "${tempDir}/frame_%04d.png" \
        -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
        -movflags +faststart \
        -y "${outputPath}"`;

      execSync(videoCommand, { stdio: 'inherit' });

      // Nettoyer les frames temporaires
      import('fs').then(({ rmSync }) => {
        rmSync(tempDir, { recursive: true, force: true });
      });

      console.log(`\n✅ Vidéo générée avec succès!`);
      console.log(`📁 Fichier: ${outputPath}\n`);

      const stats = statSync(outputPath);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);
      console.log(`📦 Taille: ${fileSizeInKB} KB\n`);
    } catch (altError) {
      console.error('\n❌ Toutes les méthodes ont échoué.');
      console.error('💡 Le problème vient probablement de la syntaxe FFmpeg.');
      console.error('\n📝 Solution alternative:');
      console.error('   1. Utiliser un outil graphique (After Effects, Premiere Pro)');
      console.error('   2. Ou créer manuellement la vidéo selon les instructions dans');
      console.error('      /docs/WAVEFORM_VIDEO_CREATION.md\n');
      process.exit(1);
    }
  }
}

// Point d'entrée
console.log('🎨 Générateur de vidéo gradient waveform\n');
console.log('═'.repeat(50));

if (!checkFFmpeg()) {
  console.error("\n❌ FFmpeg n'est pas installé ou n'est pas dans le PATH.");
  console.error('\n📦 Installation:');
  console.error('   macOS: brew install ffmpeg');
  console.error('   Linux: sudo apt-get install ffmpeg');
  console.error('   Windows: Télécharger depuis https://ffmpeg.org/download.html\n');
  process.exit(1);
}

generateVideo();
