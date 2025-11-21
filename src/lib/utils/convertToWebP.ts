import sharp from 'sharp';
import { logger } from '@/lib/logger';

/**
 * Convertit une image en WebP avec une qualité optimale
 * @param buffer - Buffer de l'image source
 * @param quality - Qualité WebP (0-100, défaut: 90 pour une qualité quasi-identique avec bonne compression)
 * @returns Buffer de l'image convertie en WebP
 */
export async function convertToWebP(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  quality: number = 90
): Promise<Buffer> {
  try {
    // Normaliser le buffer en Buffer pour sharp
    let normalizedBuffer: Buffer;
    if (Buffer.isBuffer(buffer)) {
      normalizedBuffer = buffer;
    } else if (buffer instanceof ArrayBuffer) {
      normalizedBuffer = Buffer.from(new Uint8Array(buffer));
    } else {
      normalizedBuffer = Buffer.from(buffer);
    }
    const webpBuffer = await sharp(normalizedBuffer)
      .webp({ quality, effort: 4 }) // effort 4 = bon compromis vitesse/compression
      .toBuffer();

    const originalSize = normalizedBuffer.length;
    const newSize = webpBuffer.length;
    const reduction = ((originalSize - newSize) / originalSize) * 100;

    logger.debug(
      `[WEBP] Conversion réussie: ${originalSize} → ${newSize} bytes (${reduction.toFixed(1)}% de réduction)`
    );

    return webpBuffer;
  } catch (error) {
    logger.error('[WEBP] Erreur lors de la conversion en WebP:', error);
    throw new Error("Erreur lors de la conversion de l'image en WebP");
  }
}

/**
 * Vérifie si une image peut être convertie en WebP
 * @param mimeType - Type MIME de l'image
 * @returns true si l'image peut être convertie
 */
export function canConvertToWebP(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/tiff',
    'image/bmp',
    'image/webp', // Déjà en WebP, on peut le réencoder
  ];
  return supportedTypes.includes(mimeType.toLowerCase());
}
