import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { CreateTrackInput, UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';
import { MusicType } from '@/lib/utils/types';

// GET /api/music - Récupérer toutes les pistes
export async function GET() {
  try {
    const tracks = await prisma.track.findMany({
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
        MusicCollection: data.collectionId
          ? {
              connect: { id: data.collectionId },
            }
          : undefined,
        TrackPlatform: {
          create: data.platforms.map((platform) => ({
            platform: platform.platform,
            url: platform.url,
            embedId: platform.embedId,
          })),
        },
        GenresOnTracks: {
          create: genres.map((genre) => ({
            Genre: {
              connect: { id: genre.id },
            },
          })),
        },
      },
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

    return NextResponse.json(formatTrackData(track), { status: 201 });
  } catch (error) {
    console.error('Error creating track:', error);
    return NextResponse.json({ error: 'Failed to create track' }, { status: 500 });
  }
}

// // PUT /api/music - Mettre à jour une piste (DÉPLACÉ VERS /api/music/[id]/route.ts)
// export async function PUT(request: Request) {
//   // ... Logique PUT ...
// }
//
// // DELETE /api/music?id=xxx - Supprimer une piste (DÉPLACÉ VERS /api/music/[id]/route.ts)
// export async function DELETE(request: Request) {
//   // ... Logique DELETE ...
// }
