import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';
import { v4 as uuidv4 } from 'uuid';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse } from '@/lib/api/responseHelpers';

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
      return handleApiError(new Error('Track not found'), 'GET /api/music/[id]');
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
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: Omit<UpdateTrackInput, 'id'> = await request.json();
    // Séparer genreNames et platforms du reste des données du formulaire (trackData)
    const { genreNames, platforms, ...trackData } = data;

    // Vérifier que la piste existe
    const existingTrack = await prisma.track.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Préparer les données scalaires à mettre à jour
    // Exclure explicitement les champs non scalaires ou gérés par les relations
    const {
      // Exclure les champs non scalaires ou gérés par les relations
      // updatedAt est géré ci-dessous
      ...baseDataToUpdate
    } = trackData as Record<string, unknown>;

    // Assurer les bons types pour certains champs
    if (baseDataToUpdate.releaseDate && typeof baseDataToUpdate.releaseDate === 'string') {
      baseDataToUpdate.releaseDate = new Date(baseDataToUpdate.releaseDate) as Date;
    }

    // Traitement de publishAt
    let processedPublishAt: Date | undefined | null = undefined; // undefined par défaut
    if (baseDataToUpdate.hasOwnProperty('publishAt')) {
      if (typeof baseDataToUpdate.publishAt === 'string') {
        if (baseDataToUpdate.publishAt.trim() === '') {
          processedPublishAt = null; // Explicitement mis à null si string vide
        } else {
          const d = new Date(baseDataToUpdate.publishAt);
          if (!isNaN(d.getTime())) {
            processedPublishAt = d; // Date valide
          } else {
            processedPublishAt = undefined; // Ignorer si invalide mais pas vide explicitement
          }
        }
      } else if (baseDataToUpdate.publishAt === null || baseDataToUpdate.publishAt === undefined) {
        processedPublishAt = null; // Permettre de mettre à null/undefined
      }
    }
    // Supprimer publishAt du DTO de base car il est traité séparément
    delete baseDataToUpdate.publishAt;

    if (baseDataToUpdate.bpm) {
      baseDataToUpdate.bpm = parseInt(String(baseDataToUpdate.bpm), 10);
    } else if (baseDataToUpdate.hasOwnProperty('bpm') && baseDataToUpdate.bpm === null) {
      baseDataToUpdate.bpm = null; // Permettre de mettre bpm à null
    }
    // Assurer que imageId est bien passé s'il est défini
    if (!baseDataToUpdate.hasOwnProperty('imageId')) {
      baseDataToUpdate.imageId = undefined; // Ou null selon le schéma
    }
    // Ajouter le champ updatedAt qui sera mis à jour
    baseDataToUpdate.updatedAt = new Date();

    // Gérer les genres
    let genresUpdate = undefined;
    if (genreNames !== undefined) {
      await prisma.genresOnTracks.deleteMany({ where: { trackId: id } });
      if (isNotEmpty(genreNames)) {
        const genrePromises = genreNames.map(async (name) => {
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
        genresUpdate = {
          create: genres.map((g: { id: string }) => ({ Genre: { connect: { id: g.id } } })),
        };
      } else {
        genresUpdate = { create: [] };
      }
    }

    // Gérer les plateformes
    let platformsUpdate = undefined;
    if (platforms !== undefined) {
      await prisma.trackPlatform.deleteMany({ where: { trackId: id } });
      if (isNotEmpty(platforms)) {
        platformsUpdate = {
          create: platforms.map((platform) => ({
            id: uuidv4(),
            platform: platform.platform,
            url: platform.url,
            embedId: platform.embedId,
            updatedAt: new Date(),
          })),
        };
      } else {
        platformsUpdate = { create: [] };
      }
    }

    // Mettre à jour la piste avec SEULEMENT les champs scalaires et les relations préparées
    const updatedTrack = await prisma.$transaction(async (tx) => {
      return tx.track.update({
        where: { id },
        data: {
          ...baseDataToUpdate, // Contient les champs scalaires nettoyés + updatedAt
          ...(processedPublishAt !== undefined && { publishAt: processedPublishAt }), // Utiliser la date traitée (peut être Date ou null)
          ...(genresUpdate !== undefined && { GenresOnTracks: genresUpdate }),
          ...(platformsUpdate !== undefined && { TrackPlatform: platformsUpdate }),
          MusicCollection: trackData.hasOwnProperty('collectionId')
            ? trackData.collectionId === null
              ? { disconnect: true }
              : trackData.collectionId // S'assurer que ce n'est pas undefined avant connect
                ? { connect: { id: trackData.collectionId } }
                : undefined
            : undefined,
          // isPublished est dans baseDataToUpdate s'il est dans trackData et booléen
          ...(typeof baseDataToUpdate.isPublished === 'boolean' && {
            isPublished: baseDataToUpdate.isPublished,
          }),
        },
        include: {
          TrackPlatform: true,
          GenresOnTracks: { include: { Genre: true } },
          MusicCollection: true,
          User: { select: { id: true, name: true } },
        },
      });
    });

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
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que la piste existe avant de tenter de supprimer
    const existingTrack = await prisma.track.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Supprimer la piste (Prisma gère les suppressions en cascade si configuré dans le schéma)
    await prisma.$transaction(async (tx) => {
      // Supprimer manuellement les relations si cascade n'est pas configuré ou pour être explicite
      await tx.trackPlatform.deleteMany({ where: { trackId: id } });
      // La relation TrackGenre est implicite, Prisma devrait gérer la suppression des entrées
      // dans la table jointe lors de la suppression de Track si le schéma est bien fait.
      // Sinon : await tx.trackGenre.deleteMany({ where: { trackId: id } });

      await tx.track.delete({
        where: { id },
      });
    });

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
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { imageId } = data;

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
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
