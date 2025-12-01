/**
 * Client-side utilities for audio file validation
 * These functions can be used in browser/client components
 */

const MAX_FILE_SIZE = 128 * 1024 * 1024; // 128MB
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'];

/**
 * Valide un fichier audio (utilisable côté client)
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Vérifier le type MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Le fichier doit être au format MP3 ou WAV',
    };
  }

  // Vérifier la taille
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  // Vérifier l'extension
  const extension = file.name.toLowerCase().endsWith('.mp3')
    ? '.mp3'
    : file.name.toLowerCase().endsWith('.wav')
      ? '.wav'
      : '';
  if (extension !== '.mp3' && extension !== '.wav') {
    return {
      valid: false,
      error: "Le fichier doit avoir l'extension .mp3 ou .wav",
    };
  }

  return { valid: true };
}

/**
 * Génère un ID unique pour un fichier audio (utilisable côté client)
 */
export function generateAudioFileId(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = fileName.toLowerCase().endsWith('.mp3') ? '.mp3' : '.wav';
  return `live-audio-${userId}-${timestamp}-${random}${extension}`;
}
