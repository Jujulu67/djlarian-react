import { Crop } from 'react-image-crop';

/**
 * Cette fonction centre un recadrage avec un aspect ratio spécifique
 * Elle est utile pour initialiser un recadrage avec des proportions prédéfinies.
 *
 * @param mediaWidth - Largeur de l'image en pixels
 * @param mediaHeight - Hauteur de l'image en pixels
 * @param aspect - Ratio largeur/hauteur (ex: 1 pour un carré, 16/9 pour une vidéo)
 * @returns Un objet Crop configuré pour être centré
 */
export function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  // Calculer la largeur et hauteur du crop en pourcentage
  // La taille maximale tout en respectant l'aspect ratio
  const width = 90; // 90% de la largeur par défaut

  // Ajuster la hauteur en fonction de l'aspect ratio
  let height;
  if (aspect > 1) {
    // Aspect plus large que haut (ex: 16:9)
    height = width / aspect;
  } else {
    // Aspect plus haut que large ou carré (ex: 1:1 ou 3:4)
    height = width * (1 / aspect);
  }

  // Calculer la position pour centrer le crop
  const x = (100 - width) / 2;
  const y = (100 - height) / 2;

  return {
    unit: '%',
    width,
    height,
    x,
    y,
  };
}
