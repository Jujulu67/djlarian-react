import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { formatTrackData } from '@/lib/api/musicService';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createForbiddenResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import type { MusicType, MusicPlatform } from '@/lib/utils/types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { uploadToBlob, isBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';

/**
 * Music API endpoint - Vercel (Node.js runtime natif)
 *
 * Handles creation and retrieval of music tracks
 *
 * @route POST /api/music - Create a new music track
 * @route GET /api/music - Get all music tracks
 *
 * @example
 * // Create a track
 * POST /api/music
 * {
 *   "title": "Track Title",
 *   "artist": "Artist Name",
 *   "releaseDate": "2024-01-01",
 *   "type": "single",
 *   "platforms": [{"platform": "spotify", "url": "https://..."}]
 * }
 */

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
export async function GET(): Promise<Response> {
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

    // Logique d'auto-publication
    for (const track of tracks) {
      if (track.publishAt && !track.isPublished && new Date(track.publishAt) <= new Date()) {
        await prisma.track.update({
          where: { id: track.id },
          data: { isPublished: true },
        });
        track.isPublished = true;
      }
    }

    const formattedTracks = tracks.map((track) => formatTrackData(track));

    return createSuccessResponse(formattedTracks);
  } catch (error) {
    return handleApiError(error, 'GET /api/music');
  }
}

// POST /api/music - Créer une nouvelle piste
export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  // Vérifier l'authentification
  if (!session?.user) {
    return createForbiddenResponse('Unauthorized');
  }

  // Vérifier le rôle d'admin
  if (session.user.role !== 'ADMIN') {
    return createForbiddenResponse('Insufficient permissions');
  }

  let rawData;
  try {
    rawData = await request.json();
  } catch (error) {
    return createBadRequestResponse('Invalid JSON body');
  }

  const validationResult = trackCreateSchema.safeParse(rawData);

  if (!validationResult.success) {
    logger.error('Validation failed', validationResult.error.format());
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        logger.warn('API MUSIC - Vercel Blob not configured, skipping image upload');
        // On continue sans image si Blob n'est pas configuré
      }
    } catch (err) {
      logger.error('API MUSIC - Erreur import thumbnail YouTube', err);
      // On continue sans image si erreur
    }
  }

  try {
    const track = await prisma.$transaction(async (tx) => {
      // Handle optional genreNames
      const genres = isNotEmpty(dataForPrisma.genreNames)
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
        logger.error('Erreur vérification utilisateur', userError);
      }

      // Handle optional genres connection
      const genresToConnect = isNotEmpty(genres)
        ? genres.map((genre) => ({
            Genre: { connect: { id: genre.id } },
          }))
        : undefined;

      // Handle optional platforms creation
      const platformsToCreate = isNotEmpty(dataForPrisma.platforms)
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

    return createSuccessResponse(formatTrackData(track), 201, 'Track created successfully');
  } catch (error) {
    return handleApiError(error, 'POST /api/music');
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
