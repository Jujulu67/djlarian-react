import { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';

/** Crop centré de ratio `a` (100% de la largeur) pour une image de dimensions `w` x `h`. */
export function centerAspectCrop(w: number, h: number, a: number): CropType {
  return centerCrop(makeAspectCrop({ unit: '%', width: 100 }, a, w, h), w, h);
}
