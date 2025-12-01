/**
 * Client-side utilities for audio file validation and upload
 * These functions can be used in browser/client components
 */

import { put } from '@vercel/blob';

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

/**
 * Upload un fichier audio directement vers Vercel Blob depuis le client
 * @param file - Le fichier audio à uploader
 * @param fileId - L'ID unique du fichier (généré avec generateAudioFileId)
 * @returns L'URL du fichier uploadé
 */
export async function uploadAudioFileToBlob(
  file: File,
  fileId: string
): Promise<{ url: string; size: number }> {
  try {
    // Obtenir le token depuis l'API (sécurisé, ne pas exposer le token côté client)
    const tokenResponse = await fetch('/api/live/submissions/upload-token');
    if (!tokenResponse.ok) {
      throw new Error("Impossible de récupérer le token d'upload");
    }
    const { token } = await tokenResponse.json();

    if (!token) {
      throw new Error("Token d'upload non disponible");
    }

    // Upload directement vers Vercel Blob depuis le client
    const contentType = file.type || 'audio/mpeg';
    const blob = await put(`live-audio/${fileId}`, file, {
      access: 'public',
      contentType,
      token, // Token pour l'upload (sécurisé via endpoint authentifié)
    });

    return {
      url: blob.url,
      size: file.size,
    };
  } catch (error) {
    console.error('[Live Upload Client] Erreur upload Blob:', error);
    throw new Error("Erreur lors de l'upload vers Blob Storage");
  }
}
