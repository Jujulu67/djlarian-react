import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { CreateTrackInput, UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';

// GET /api/music - Récupérer toutes les pistes
export async function GET() {
  try {
    const tracks = await prisma.track.findMany({
      include: {
        platforms: true,
        genres: {
          include: {
            genre: true,
          },
        },
        collection: true,
      },
      orderBy: [{ featured: 'desc' }, { releaseDate: 'desc' }],
    });

    const formattedTracks = tracks.map((track) => formatTrackData(track));

    return NextResponse.json(formattedTracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}

// POST /api/music - Créer une nouvelle piste
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier le rôle d'admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data: CreateTrackInput = await request.json();

    // Créer ou récupérer les genres
    const genrePromises = data.genreNames.map(async (name) => {
      const normalizedName = name.trim().toLowerCase();
      return prisma.genre.upsert({
        where: { name: normalizedName },
        update: {},
        create: { name: normalizedName },
      });
    });

    const genres = await Promise.all(genrePromises);

    // Vérifier si l'utilisateur existe
    let userConnect = {};
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (userExists) {
        userConnect = {
          user: {
            connect: { id: session.user.id },
          },
        };
      } else {
        console.log(`Utilisateur avec ID ${session.user.id} n'existe pas dans la base de données`);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'utilisateur:", error);
      // On continue sans établir la relation utilisateur
    }

    // Créer la piste avec ses relations
    const track = await prisma.track.create({
      data: {
        title: data.title,
        artist: data.artist,
        releaseDate: new Date(data.releaseDate),
        coverUrl: data.coverUrl,
        bpm: data.bpm,
        description: data.description,
        type: data.type,
        featured: data.featured || false,
        ...userConnect,
        collection: data.collectionId
          ? {
              connect: { id: data.collectionId },
            }
          : undefined,
        platforms: {
          create: data.platforms.map((platform) => ({
            platform: platform.platform,
            url: platform.url,
            embedId: platform.embedId,
          })),
        },
        genres: {
          create: genres.map((genre) => ({
            genre: {
              connect: { id: genre.id },
            },
          })),
        },
      },
      include: {
        platforms: true,
        genres: {
          include: {
            genre: true,
          },
        },
        collection: true,
      },
    });

    return NextResponse.json(formatTrackData(track), { status: 201 });
  } catch (error) {
    console.error('Error creating track:', error);
    return NextResponse.json({ error: 'Failed to create track' }, { status: 500 });
  }
}

// PUT /api/music - Mettre à jour une piste
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier le rôle d'admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Log des informations de session pour debug
    console.log('Session user info for music update:', JSON.stringify(session.user, null, 2));

    const data: UpdateTrackInput = await request.json();
    const { id, genreNames, platforms, ...trackData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Vérifier que la piste existe
    const existingTrack = await prisma.track.findUnique({
      where: { id },
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Mettre à jour les données de base
    const dataToUpdate: any = {
      title: trackData.title,
      artist: trackData.artist,
      description: trackData.description,
      type: trackData.type as MusicType,
      releaseDate: new Date(trackData.releaseDate),
      featured: trackData.featured || false,
      bpm: trackData.bpm ? parseInt(String(trackData.bpm)) : null,
      coverUrl: trackData.coverUrl || null,
      originalImageUrl: trackData.originalImageUrl || null,
    };

    // Gérer les mises à jour des genres
    if (genreNames && genreNames.length > 0) {
      // Supprimer les associations genre existantes
      await prisma.genresOnTracks.deleteMany({
        where: { trackId: id },
      });

      // Créer ou récupérer les nouveaux genres
      const genrePromises = genreNames.map(async (name) => {
        const normalizedName = name.trim().toLowerCase();
        return prisma.genre.upsert({
          where: { name: normalizedName },
          update: {},
          create: { name: normalizedName },
        });
      });

      const genres = await Promise.all(genrePromises);

      // Créer de nouvelles associations
      for (const genre of genres) {
        await prisma.genresOnTracks.create({
          data: {
            trackId: id,
            genreId: genre.id,
          },
        });
      }
    }

    // Gérer les mises à jour des plateformes
    if (platforms && platforms.length > 0) {
      // Supprimer les plateformes existantes
      await prisma.trackPlatform.deleteMany({
        where: { trackId: id },
      });

      // Créer les nouvelles plateformes
      for (const platform of platforms) {
        await prisma.trackPlatform.create({
          data: {
            trackId: id,
            platform: platform.platform,
            url: platform.url,
            embedId: platform.embedId,
          },
        });
      }
    }

    // Mettre à jour la piste
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: dataToUpdate,
      include: {
        platforms: true,
        genres: {
          include: {
            genre: true,
          },
        },
        collection: true,
      },
    });

    return NextResponse.json(formatTrackData(updatedTrack));
  } catch (error) {
    console.error('Error updating track:', error);
    return NextResponse.json({ error: 'Failed to update track' }, { status: 500 });
  }
}

// DELETE /api/music?id=xxx - Supprimer une piste
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier le rôle d'admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Récupérer l'ID de la piste depuis les paramètres de requête
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    // Vérifier que la piste existe
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Supprimer d'abord les relations
    await prisma.genresOnTracks.deleteMany({
      where: { trackId: id },
    });

    await prisma.trackPlatform.deleteMany({
      where: { trackId: id },
    });

    // Puis supprimer la piste
    await prisma.track.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting track:', error);
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 });
  }
}
