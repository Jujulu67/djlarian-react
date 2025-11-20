/**
 * Extrait l'identifiant de base d'une image
 * Ex: cover1.jpg, cover1-ori.jpg, cover1-ori.png -> cover1
 */
export function extractImageId(name: string): string {
  return name.replace(/-ori(\.[a-zA-Z0-9]+)?$/, '').replace(/\.[a-zA-Z0-9]+$/, '');
}
