import { NextResponse } from 'next/server';
import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { formatTrackData } from '@/lib/api/musicService';
import { MusicType, MusicPlatform } from '@/lib/utils/types';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadToBlob, isBlobConfigured, getBlobPublicUrl } from '@/lib/blob';

// Music API endpoint - Vercel (Node.js runtime natif)

// Define actual arrays for Zod enums from types
const musicTypes: [MusicType, ...MusicType[]] = [
  'single',
  'ep',
  'album',
  'remix',
  'live',
  'djset',
  'video',
];
const musicPlatforms: [MusicPlatform, ...MusicPlatform[]] = [
  'spotify',
  'youtube',
  'soundcloud',
  'apple',
  'deezer',
];

// Define Zod schema for validation
const trackCreateSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  artist: z.string().min(1, { message: 'Artist is required' }),
  releaseDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format for releaseDate',
  }),
  imageId: z.string().uuid().optional().nullable(),
  bpm: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  type: z.enum(musicTypes),
  featured: z.boolean().optional(),
  genreNames: z.array(z.string().min(1)).optional(),
  platforms: z
    .array(
      z.object({
        platform: z.enum(musicPlatforms),
        url: z.string().url({ message: 'Invalid URL for platform URL' }),
        embedId: z.string().optional().nullable(),
      })
    )
    .optional(),
  collectionId: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional(),
  publishAt: z.string().optional(),
});

// Re-define CreateTrackInput based on Zod schema if needed elsewhere, or use z.infer
type CreateTrackInput = z.infer<typeof trackCreateSchema>;

// GET /api/music - Récupérer toutes les pistes
export async function GET() {
  try {
    const tracks = await prisma.track.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        imageId: true,
        releaseDate: true,
        bpm: true,
        description: true,
        type: true,
        featured: true,
        isPublished: true,
        publishAt: true,
        createdAt: true,
        updatedAt: true,
        TrackPlatform: { select: { platform: true, url: true, embedId: true } },
        GenresOnTracks: { include: { Genre: { select: { name: true } } } },
        MusicCollection: { select: { id: true, title: true } },
        User: { select: { id: true, name: true } },
      },
      orderBy: [{ featured: 'desc' }, { releaseDate: 'desc' }],
    });

    // Logique d'auto-publication
    for (const track of tracks) {
      if (
        'publishAt' in track &&
        track.publishAt &&
        !track.isPublished &&
        new Date(track.publishAt) <= new Date()
      ) {
        await prisma.track.update({
          where: { id: track.id },
          data: { isPublished: true },
        });
        track.isPublished = true;
      }
    }

    const formattedTracks = tracks.map((track) => formatTrackData(track as any));

    return NextResponse.json(formattedTracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}

// POST /api/music - Créer une nouvelle piste
export async function POST(request: Request) {
  const session = await auth();

  // Vérifier l'authentification
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Vérifier le rôle d'admin
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let rawData;
  try {
    rawData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = trackCreateSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.format());
    return NextResponse.json(
      {
        error: 'Invalid input data',
        details: validationResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data: CreateTrackInput = validationResult.data;

  // Traitement de publishAt
  let processedPublishAt: Date | undefined | null = undefined;
  if (data.hasOwnProperty('publishAt') && typeof data.publishAt === 'string') {
    if (data.publishAt.trim() === '') {
      processedPublishAt = null; // Mettre à null si string vide
    } else {
      const d = new Date(data.publishAt);
      if (!isNaN(d.getTime())) {
        processedPublishAt = d; // Utiliser la date valide
      }
      // Si invalide, on laisse processedPublishAt = undefined
    }
  } else if (
    data.hasOwnProperty('publishAt') &&
    (data.publishAt === null || data.publishAt === undefined)
  ) {
    processedPublishAt = null;
  }

  // Supprimer publishAt du DTO Zod car il est traité et sera passé séparément à Prisma
  const { publishAt, ...dataForPrisma } = data;

  let imageId = dataForPrisma.imageId;
  if (!imageId && dataForPrisma.thumbnailUrl) {
    try {
      imageId = uuidv4();
      const response = await fetch(dataForPrisma.thumbnailUrl);
      if (!response.ok) throw new Error('Thumbnail fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Déterminer le type MIME depuis l'URL ou la réponse
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extension = contentType.includes('png') ? 'png' : 'jpg';
      
      // Sauvegarder dans Vercel Blob si configuré
      if (isBlobConfigured) {
        const key = `uploads/${imageId}.${extension}`;
        const originalKey = `uploads/${imageId}-ori.${extension}`;
        await uploadToBlob(key, buffer, contentType);
        await uploadToBlob(originalKey, buffer, contentType);
        dataForPrisma.imageId = imageId;
      } else {
        console.warn('[API MUSIC] Vercel Blob not configured, skipping image upload');
        // On continue sans image si Blob n'est pas configuré
      }
    } catch (err) {
      console.error('[API MUSIC] Erreur import thumbnail YouTube:', err);
      // On continue sans image si erreur
    }
  }

  try {
    const track = await prisma.$transaction(async (tx) => {
      // Handle optional genreNames
      const genres =
        dataForPrisma.genreNames && dataForPrisma.genreNames.length > 0
          ? await Promise.all(
              dataForPrisma.genreNames.map(async (name: string) => {
                const normalizedName = name.trim().toLowerCase();
                return tx.genre.upsert({
                  where: { name: normalizedName },
                  update: {},
                  create: {
                    id: uuidv4(),
                    name: normalizedName,
                    updatedAt: new Date(),
                  },
                });
              })
            )
          : [];

      let userConnect = {};
      try {
        const userExists = await prisma.user.findFirst({
          where: { id: session.user.id },
          select: { id: true },
        });
        if (userExists) {
          userConnect = { User: { connect: { id: session.user.id } } };
        }
      } catch (userError) {
        console.error('Erreur vérification utilisateur:', userError);
      }

      // Handle optional genres connection
      const genresToConnect =
        genres.length > 0
          ? genres.map((genre) => ({
              Genre: { connect: { id: genre.id } },
            }))
          : undefined;

      // Handle optional platforms creation
      const platformsToCreate =
        dataForPrisma.platforms && dataForPrisma.platforms.length > 0
          ? dataForPrisma.platforms.map((platform) => ({
              id: uuidv4(),
              platform: platform.platform,
              url: platform.url,
              embedId: platform.embedId,
              updatedAt: new Date(),
            }))
          : undefined;

      const newTrack = await tx.track.create({
        data: {
          id: uuidv4(),
          title: dataForPrisma.title,
          artist: dataForPrisma.artist,
          releaseDate: new Date(dataForPrisma.releaseDate),
          imageId: dataForPrisma.imageId,
          bpm: dataForPrisma.bpm,
          description: dataForPrisma.description,
          type: dataForPrisma.type,
          featured: dataForPrisma.featured || false,
          isPublished: true,
          ...(processedPublishAt !== undefined && { publishAt: processedPublishAt }),
          updatedAt: new Date(),
          ...userConnect,
          MusicCollection: dataForPrisma.collectionId
            ? { connect: { id: dataForPrisma.collectionId } }
            : undefined,
          ...(platformsToCreate && { TrackPlatform: { create: platformsToCreate } }),
          ...(genresToConnect && { GenresOnTracks: { create: genresToConnect } }),
        },
      });

      const fullTrack = await tx.track.findUniqueOrThrow({
        where: { id: newTrack.id },
        include: {
          TrackPlatform: true,
          GenresOnTracks: { include: { Genre: true } },
          MusicCollection: true,
          User: { select: { id: true, name: true } },
        },
      });

      return fullTrack;
    });

    return NextResponse.json(formatTrackData(track), { status: 201 });
  } catch (error) {
    console.error('Error during track creation transaction:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const fields = (error.meta?.target as string[]) ?? ['unknown field'];
        return NextResponse.json(
          { error: `Unique constraint failed on field(s): ${fields.join(', ')}` },
          { status: 409 }
        );
      }
      if (error.code === 'P2003') {
        const field = (error.meta?.field_name as string) ?? 'unknown relation';
        let userFriendlyMessage = `Relation constraint failed on field: ${field}`;
        if (field.includes('collectionId')) {
          userFriendlyMessage = 'The selected music collection does not exist.';
        }
        return NextResponse.json({ error: userFriendlyMessage }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Failed to save track to database' }, { status: 500 });
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
