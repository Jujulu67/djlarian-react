import type { MusicPlatform } from '@/lib/utils/types';

import type { useTrackForm } from '../hooks/useTrackForm';

type TrackFormData = ReturnType<typeof useTrackForm>['currentForm'];

/** Plateformes renseignées (URL non vide) au format attendu par l'API. */
export function buildPlatformsArray(platforms: TrackFormData['platforms'] | undefined) {
  return Object.entries(platforms || {})
    .filter(([, v]) => v?.url)
    .map(([p, v]) => ({ platform: p as MusicPlatform, url: v!.url, embedId: v!.embedId }));
}

/** Corps de requête (POST/PUT) d'une track, sans les champs non valides pour Prisma. */
export function buildTrackRequestBody(
  currentForm: TrackFormData,
  imageId: string | null | undefined,
  platformsArray: ReturnType<typeof buildPlatformsArray>
) {
  const {
    id: _id, // Garder id séparément si nécessaire
    user: _user,
    collection: _collection,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    genre: _genre, // Exclure genre car on utilise genreNames
    platforms: _platforms, // Exclure platforms car on utilise platformsArray
    ...cleanFormData
  } = currentForm;

  // Extraire collectionId depuis collection si présent
  const collectionId = currentForm.collection?.id || undefined;

  return {
    ...cleanFormData,
    imageId,
    genreNames: currentForm.genre || [],
    platforms: platformsArray,
    publishAt: currentForm.publishAt ? new Date(currentForm.publishAt).toISOString() : undefined,
    // Inclure collectionId si présent
    ...(collectionId !== undefined && { collectionId }),
  };
}
