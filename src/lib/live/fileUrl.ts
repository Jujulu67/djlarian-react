/**
 * Contrôle des URL de fichiers audio Live envoyées par le client.
 * Un fichier Live est rangé sous `live-audio/live-audio-<userId>-…` (Blob) ou
 * `/uploads/live-audio/live-audio-<userId>-…` (stockage local) : voir generateAudioFileId.
 */

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';
const LOCAL_PREFIX = '/uploads/live-audio/';
const FILE_PREFIX = 'live-audio-';
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/** Nom de fichier Live si l'URL désigne un fichier du dossier live-audio, sinon null. */
function liveAudioFileName(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 2048) return null;

  let name: string;
  if (url.startsWith(LOCAL_PREFIX)) {
    name = url.slice(LOCAL_PREFIX.length);
  } else {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return null;
    if (parsed.search || parsed.hash || !parsed.pathname.startsWith('/live-audio/')) return null;
    name = parsed.pathname.slice('/live-audio/'.length);
  }

  return SAFE_NAME.test(name) && name.startsWith(FILE_PREFIX) ? name : null;
}

/** Vrai si l'URL désigne un fichier audio Live (n'importe quel utilisateur). */
export function isLiveAudioUrl(url: unknown): url is string {
  return liveAudioFileName(url) !== null;
}

/** Vrai si l'URL désigne un fichier audio Live déposé par cet utilisateur. */
export function isOwnLiveAudioUrl(url: unknown, userId: string): url is string {
  const name = liveAudioFileName(url);
  return name !== null && name.startsWith(`${FILE_PREFIX}${userId}-`);
}

/** Vrai si l'URL désigne un fichier audio Live stocké sur Vercel Blob (téléchargeable côté serveur). */
export function isLiveAudioBlobUrl(url: unknown): url is string {
  return isLiveAudioUrl(url) && !url.startsWith(LOCAL_PREFIX);
}
