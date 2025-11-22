import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { formatTrackData } from '@/lib/api/musicService';
import {
  createSuccessResponse,
  createForbiddenResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { generateImageId } from '@/lib/utils/generateImageId';
import { saveImage } from '@/lib/utils/saveImage';
import type { MusicType, MusicPlatform } from '@/lib/utils/types';

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
  imageId: z
    .string()
    .regex(/^[a-z0-9]+-[a-z0-9]+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .optional()
    .nullable(), // Accepte le nouveau format court (timestamp-random) ou l'ancien UUID
  bpm: z.number().int().positive().optional().nullable(),
  musicalKey: z.string().optional().nullable(),
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

    const formattedTracks = tracks.map((track: Parameters<typeof formatTrackData>[0]) =>
      formatTrackData(track)
    );

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
    return createBadRequestResponse('Invalid input data', {
      details: validationResult.error.flatten().fieldErrors,
    });
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

  // Si pas d'imageId mais qu'on a des plateformes, essayer de récupérer l'image depuis les plateformes
  if (!imageId && !dataForPrisma.thumbnailUrl && dataForPrisma.platforms) {
    try {
      const platforms = dataForPrisma.platforms.reduce(
        (acc, p) => {
          if (p.platform === 'spotify') acc.spotify = p.url;
          else if (p.platform === 'soundcloud') acc.soundcloud = p.url;
          else if (p.platform === 'youtube') acc.youtube = p.url;
          return acc;
        },
        {} as { spotify?: string; soundcloud?: string; youtube?: string }
      );

      const { fetchThumbnailFromPlatforms } = await import(
        '@/lib/utils/fetchThumbnailFromPlatforms'
      );
      const thumbnailResult = await fetchThumbnailFromPlatforms(platforms);

      if (thumbnailResult) {
        dataForPrisma.thumbnailUrl = thumbnailResult.url;
        logger.debug(
          `API MUSIC - Image trouvée depuis ${thumbnailResult.source}: ${thumbnailResult.url}`
        );
      }
    } catch (err) {
      logger.warn('API MUSIC - Erreur récupération image depuis plateformes:', err);
      // On continue, on essaiera thumbnailUrl si fourni
    }
  }

  // Si on a une thumbnailUrl (fournie ou récupérée depuis les plateformes), la télécharger et sauvegarder
  if (!imageId && dataForPrisma.thumbnailUrl) {
    try {
      imageId = generateImageId();
      const response = await fetch(dataForPrisma.thumbnailUrl);
      if (!response.ok) throw new Error('Thumbnail fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer) as Buffer;

      // Convertir en WebP si possible
      let webpBuffer = buffer;
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (canConvertToWebP(contentType)) {
        try {
          webpBuffer = await convertToWebP(buffer);
          logger.debug('API MUSIC - Thumbnail converti en WebP');
        } catch (error) {
          logger.warn('API MUSIC - Erreur conversion WebP, utilisation originale', error);
        }
      }

      // Sauvegarder l'image (locale ou Blob) via la fonction utilitaire partagée
      const savedImageId = await saveImage(imageId, webpBuffer, webpBuffer);
      if (savedImageId) {
        dataForPrisma.imageId = savedImageId;
        logger.debug(`API MUSIC - Image sauvegardée avec succès: ${savedImageId}`);
      } else {
        logger.warn("API MUSIC - Échec de la sauvegarde de l'image, continuation sans image");
      }
    } catch (err) {
      logger.error('API MUSIC - Erreur import thumbnail', err);
      // On continue sans image si erreur
    }
  }

  try {
    const track = await prisma.$transaction(
      async (
        tx: Omit<
          typeof prisma,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >
      ) => {
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
            musicalKey: dataForPrisma.musicalKey,
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
      }
    );

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
