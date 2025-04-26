import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';
import { MusicType } from '@/lib/utils/types';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

// GET /api/music/[id] - Récupérer une piste spécifique
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // Attendre la résolution de la Promise params
  const resolvedParams = await context.params;
  const id = resolvedParams.id; // Accéder à l'ID sur l'objet résolu

  console.log('API Route GET - Resolved params:', resolvedParams); // Log optionnel pour confirmer

  if (!id) {
    return NextResponse.json({ error: 'Track ID is required or invalid' }, { status: 400 });
  }

  try {
    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        artist: true,
        imageId: true,
        releaseDate: true,
        description: true,
        bpm: true,
        featured: true,
        isPublished: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        TrackPlatform: { select: { platform: true, url: true, embedId: true } },
        GenresOnTracks: { include: { Genre: { select: { name: true } } } },
        MusicCollection: { select: { id: true, title: true } },
        User: { select: { id: true, name: true } },
      },
    });

    if (!track) {
      console.error(`Track not found with ID: ${id}`);
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    return NextResponse.json(formatTrackData(track as any));
  } catch (error) {
    console.error(`Error fetching track ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch track' }, { status: 500 });
  }
}

// PUT /api/music/[id] - Mettre à jour une piste spécifique
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  // Attendre la résolution de la Promise params
  const resolvedParams = await context.params;
  const id = (await resolvedParams).id;

  if (!id) {
    return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
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
      coverUrl,
      originalImageUrl,
      genre, // Exclure explicitement le tableau genre du formulaire
      // Exclure d'autres champs potentiellement présents dans trackData mais non modifiables directement
      user,
      collection,
      createdAt,
      // updatedAt est géré ci-dessous
      ...baseDataToUpdate
    } = trackData as any;

    // Assurer les bons types pour certains champs
    if (baseDataToUpdate.releaseDate) {
      baseDataToUpdate.releaseDate = new Date(baseDataToUpdate.releaseDate);
    }
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
      if (genreNames.length > 0) {
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
      if (platforms.length > 0) {
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

    return NextResponse.json(formatTrackData(updatedTrack));
  } catch (error) {
    console.error(`Error updating track ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update track';
    // Renvoyer l'erreur Prisma brute si disponible pour le débogage
    const prismaError =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError
        ? error.message
        : null;
    return NextResponse.json({ error: prismaError || errorMessage }, { status: 500 });
  }
}

// DELETE /api/music/[id] - Supprimer une piste spécifique
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  // Attendre la résolution de la Promise params
  const resolvedParams = await context.params;
  const id = resolvedParams.id; // Accéder à l'ID sur l'objet résolu

  if (!id) {
    return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
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

    return NextResponse.json({ message: 'Track deleted successfully' }, { status: 200 }); // Utiliser 200 ou 204
  } catch (error) {
    console.error(`Error deleting track ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 });
  }
}

// PATCH /api/music/[id] - Mise à jour partielle (ex: imageId)
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const id = resolvedParams.id;

  if (!id) {
    return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
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

    return NextResponse.json({ success: true, track: updatedTrack });
  } catch (error) {
    console.error(`Error PATCH track ${id}:`, error);
    return NextResponse.json({ error: 'Failed to patch track' }, { status: 500 });
  }
}
