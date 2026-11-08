import { v4 as uuidv4 } from 'uuid';

import { auth } from '@/auth';
import { requireAdmin } from '@/lib/api/requireAuth';
import { handleApiError } from '@/lib/api/errorHandler';
import { UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import { isScheduledInFuture } from '@/lib/music-publication';
import prisma from '@/lib/prisma';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';

type TrackGenreNamesInput = NonNullable<UpdateTrackInput['genreNames']>;
type TrackPlatformsInput = NonNullable<UpdateTrackInput['platforms']>;

// Traitement de publishAt : Date, null (à effacer) ou undefined (ne pas modifier)
function resolvePublishAt(data: Record<string, unknown>): Date | undefined | null {
  let processedPublishAt: Date | undefined | null = undefined; // undefined par défaut
  if (data.hasOwnProperty('publishAt')) {
    if (typeof data.publishAt === 'string') {
      if (data.publishAt.trim() === '') {
        processedPublishAt = null; // Explicitement mis à null si string vide
      } else {
        const d = new Date(data.publishAt);
        // Date valide, sinon ignorer (pas vide explicitement)
        processedPublishAt = Number.isNaN(d.getTime()) ? undefined : d;
      }
    } else if (data.publishAt === null || data.publishAt === undefined) {
      processedPublishAt = null; // Permettre de mettre à null/undefined
    }
  }
  return processedPublishAt;
}

// Normalise les champs scalaires en place et renvoie la date de publication traitée
function normalizeTrackScalars(data: Record<string, unknown>): Date | undefined | null {
  // Assurer les bons types pour certains champs
  if (data.releaseDate && typeof data.releaseDate === 'string') {
    data.releaseDate = new Date(data.releaseDate) as Date;
  }

  const processedPublishAt = resolvePublishAt(data);
  // Supprimer publishAt du DTO de base car il est traité séparément
  delete data.publishAt;

  if (data.bpm) {
    data.bpm = Number.parseInt(String(data.bpm), 10);
  } else if (data.hasOwnProperty('bpm') && data.bpm === null) {
    data.bpm = null; // Permettre de mettre bpm à null
  }
  // Assurer que imageId est bien passé s'il est défini
  if (!data.hasOwnProperty('imageId')) {
    data.imageId = undefined; // Ou null selon le schéma
  }
  // Ajouter le champ updatedAt qui sera mis à jour
  data.updatedAt = new Date();

  return processedPublishAt;
}

// Relation MusicCollection : déconnexion, connexion ou pas de modification
function resolveCollectionUpdate(
  hasCollectionId: boolean,
  collectionId: string | null | undefined
): { disconnect: true } | { connect: { id: string } } | undefined {
  if (!hasCollectionId) return undefined;
  if (collectionId === null) return { disconnect: true };
  // S'assurer que ce n'est pas undefined avant connect
  return collectionId ? { connect: { id: collectionId } } : undefined;
}

// Remplace les genres de la piste (suppression puis création/liaison)
async function buildGenresUpdate(trackId: string, genreNames: TrackGenreNamesInput) {
  await prisma.genresOnTracks.deleteMany({ where: { trackId } });
  if (!isNotEmpty(genreNames)) {
    return { create: [] };
  }
  const genrePromises = genreNames.map((name) => {
    const normalizedName = name.trim().toLowerCase();
    return prisma.genre.upsert({
      where: { name: normalizedName },
      update: {},
      create: {
        id: uuidv4(),
        name: normalizedName,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
  });
  const genres = await Promise.all(genrePromises);
  return {
    create: genres.map((g: { id: string }) => ({ Genre: { connect: { id: g.id } } })),
  };
}

// Remplace les plateformes de la piste (suppression puis création)
async function buildPlatformsUpdate(trackId: string, platforms: TrackPlatformsInput) {
  await prisma.trackPlatform.deleteMany({ where: { trackId } });
  if (!isNotEmpty(platforms)) {
    return { create: [] };
  }
  return {
    create: platforms.map((platform) => ({
      id: uuidv4(),
      platform: platform.platform,
      url: platform.url,
      embedId: platform.embedId,
      updatedAt: new Date(),
    })),
  };
}

// GET /api/music/[id] - Récupérer une piste spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return handleApiError(new Error('Track ID is required or invalid'), 'GET /api/music/[id]');
    }

    const track = await prisma.track.findUnique({
      where: { id },
      include: {
        TrackPlatform: true,
        GenresOnTracks: {
          include: {
            Genre: true,
          },
        },
        MusicCollection: true,
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!track) {
      return createNotFoundResponse('Track not found');
    }

    // Une piste non publiée (et dont la date de publication n'est pas passée) n'existe pas
    // pour un visiteur : 404, comme une piste inexistante.
    const isVisible =
      track.isPublished || (track.publishAt !== null && new Date(track.publishAt) <= new Date());
    if (!isVisible) {
      const session = await auth();
      if (session?.user?.role !== 'ADMIN') {
        return createNotFoundResponse('Track not found');
      }
    }

    return createSuccessResponse(formatTrackData(track));
  } catch (error) {
    return handleApiError(error, 'GET /api/music/[id]');
  }
}

// PUT /api/music/[id] - Mettre à jour une piste spécifique
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return handleApiError(new Error('Track ID is required'), 'PUT /api/music/[id]');
    }
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Unauthorized'),
      onNonAdmin: () => createUnauthorizedResponse('Unauthorized'),
    });
    if (authError) return authError;

    const data: Omit<UpdateTrackInput, 'id'> = await request.json();
    // Séparer genreNames et platforms du reste des données du formulaire (trackData)
    const { genreNames, platforms, ...trackData } = data;

    // Vérifier que la piste existe
    const existingTrack = await prisma.track.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTrack) {
      return createNotFoundResponse('Track not found');
    }

    // Préparer les données scalaires à mettre à jour
    // Exclure explicitement les champs non scalaires ou gérés par les relations
    const {
      // Exclure les champs non scalaires ou gérés par les relations
      // updatedAt est géré ci-dessous
      ...baseDataToUpdate
    } = trackData as Record<string, unknown>;

    // Normalisation des champs scalaires (dates, bpm, imageId, updatedAt)
    const processedPublishAt = normalizeTrackScalars(baseDataToUpdate);

    // Gérer les genres
    const genresUpdate =
      genreNames !== undefined ? await buildGenresUpdate(id, genreNames) : undefined;

    // Gérer les plateformes
    const platformsUpdate =
      platforms !== undefined ? await buildPlatformsUpdate(id, platforms) : undefined;

    // Mettre à jour la piste avec SEULEMENT les champs scalaires et les relations préparées
    const updatedTrack = await prisma.$transaction(
      (
        tx: Omit<
          typeof prisma,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >
      ) => {
        return tx.track.update({
          where: { id },
          data: {
            ...baseDataToUpdate, // Contient les champs scalaires nettoyés + updatedAt
            ...(processedPublishAt !== undefined && { publishAt: processedPublishAt }), // Utiliser la date traitée (peut être Date ou null)
            ...(genresUpdate !== undefined && { GenresOnTracks: genresUpdate }),
            ...(platformsUpdate !== undefined && { TrackPlatform: platformsUpdate }),
            MusicCollection: resolveCollectionUpdate(
              trackData.hasOwnProperty('collectionId'),
              trackData.collectionId
            ),
            // isPublished est dans baseDataToUpdate s'il est dans trackData et booléen
            ...(typeof baseDataToUpdate.isPublished === 'boolean' && {
              isPublished: baseDataToUpdate.isPublished,
            }),
            // Publication programmée plus tard : le morceau reste caché jusqu'à publishAt
            ...(isScheduledInFuture(processedPublishAt) && { isPublished: false }),
          },
          include: {
            TrackPlatform: true,
            GenresOnTracks: { include: { Genre: true } },
            MusicCollection: true,
            User: { select: { id: true, name: true } },
          },
        });
      }
    );

    return createSuccessResponse(formatTrackData(updatedTrack));
  } catch (error) {
    return handleApiError(error, 'PUT /api/music/[id]');
  }
}

// DELETE /api/music/[id] - Supprimer une piste spécifique
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return handleApiError(new Error('Track ID is required'), 'DELETE /api/music/[id]');
    }
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Unauthorized'),
      onNonAdmin: () => createUnauthorizedResponse('Unauthorized'),
    });
    if (authError) return authError;

    // Vérifier que la piste existe avant de tenter de supprimer
    const existingTrack = await prisma.track.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTrack) {
      return createNotFoundResponse('Track not found');
    }

    // Supprimer la piste (Prisma gère les suppressions en cascade si configuré dans le schéma)
    await prisma.$transaction(
      async (
        tx: Omit<
          typeof prisma,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >
      ) => {
        // Supprimer manuellement les relations si cascade n'est pas configuré ou pour être explicite
        await tx.trackPlatform.deleteMany({ where: { trackId: id } });
        // La relation TrackGenre est implicite, Prisma devrait gérer la suppression des entrées
        // dans la table jointe lors de la suppression de Track si le schéma est bien fait.
        // Sinon : await tx.trackGenre.deleteMany({ where: { trackId: id } });

        await tx.track.delete({
          where: { id },
        });
      }
    );

    return createSuccessResponse({ message: 'Track deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/music/[id]');
  }
}

// PATCH /api/music/[id] - Mise à jour partielle (ex: imageId)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return handleApiError(new Error('Track ID is required'), 'PATCH /api/music/[id]');
    }
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Unauthorized'),
      onNonAdmin: () => createUnauthorizedResponse('Unauthorized'),
    });
    if (authError) return authError;

    const data = await request.json();
    const { imageId } = data;

    if (!imageId) {
      return createBadRequestResponse('imageId is required');
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: { imageId },
    });

    return createSuccessResponse({ success: true, track: updatedTrack });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/music/[id]');
  }
}
