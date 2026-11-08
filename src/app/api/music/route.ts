import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { auth } from '@/auth';
import { requireAdmin } from '@/lib/api/requireAuth';
import { handleApiError } from '@/lib/api/errorHandler';
import { formatTrackData } from '@/lib/api/musicService';
import {
  createSuccessResponse,
  createForbiddenResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import { logger } from '@/lib/logger';
import { isScheduledInFuture, publicTrackWhere } from '@/lib/music-publication';
import prisma from '@/lib/prisma';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { generateImageId, isValidImageId } from '@/lib/utils/generateImageId';
import { saveImage } from '@/lib/utils/saveImage';
import type { MusicType, MusicPlatform } from '@/lib/utils/types';
import { NextRequest } from 'next/server';

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
  releaseDate: z.string().refine((date) => !Number.isNaN(new Date(date).getTime()), {
    message: 'Invalid date format for releaseDate',
  }),
  imageId: z.string().refine(isValidImageId, 'Identifiant d’image invalide').optional().nullable(), // Accepte le nouveau format court (timestamp-random) ou l'ancien UUID
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

// GET /api/music - Récupérer les pistes (toutes pour un admin, publiées seulement sinon)
export async function GET(): Promise<Response> {
  try {
    // Vérifier que Prisma est correctement initialisé
    if (!prisma) {
      logger.error('[API MUSIC] Prisma client non initialisé');
      return handleApiError(new Error('Database connection not available'), 'GET /api/music');
    }

    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    const tracks = await prisma.track.findMany({
      // Un visiteur ne voit que les pistes publiées (ou dont la date de publication est
      // passée : elles sont publiées plus bas), comme pour /api/events.
      ...(isAdmin ? {} : { where: publicTrackWhere() }),
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
        try {
          await prisma.track.update({
            where: { id: track.id },
            data: { isPublished: true },
          });
          track.isPublished = true;
        } catch (updateError) {
          // Logger l'erreur mais ne pas bloquer la réponse
          logger.warn(
            `[API MUSIC] Erreur lors de la mise à jour de la track ${track.id}:`,
            updateError
          );
        }
      }
    }

    const formattedTracks = tracks.map((track: Parameters<typeof formatTrackData>[0]) =>
      formatTrackData(track)
    );

    return createSuccessResponse(formattedTracks);
  } catch (error) {
    logger.error('[API MUSIC] Erreur dans GET /api/music:', error);
    return handleApiError(error, 'GET /api/music');
  }
}

type PrismaTxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
type TrackPayload = Omit<CreateTrackInput, 'publishAt'>;

/** Traitement de publishAt : null si vide ou nul, date si valide, undefined si invalide. */
function parsePublishAt(data: CreateTrackInput): Date | undefined | null {
  if (data.hasOwnProperty('publishAt') && typeof data.publishAt === 'string') {
    if (data.publishAt.trim() === '') return null; // Mettre à null si string vide
    const d = new Date(data.publishAt);
    // Date valide : on l'utilise ; sinon undefined
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (
    data.hasOwnProperty('publishAt') &&
    (data.publishAt === null || data.publishAt === undefined)
  ) {
    return null;
  }
  return undefined;
}

/** Récupère l'URL d'une miniature à partir des plateformes (Spotify, SoundCloud, YouTube). */
async function findThumbnailFromPlatforms(
  platforms: NonNullable<TrackPayload['platforms']>
): Promise<string | undefined> {
  try {
    const platformUrls = platforms.reduce(
      (acc, p) => {
        if (p.platform === 'spotify') acc.spotify = p.url;
        else if (p.platform === 'soundcloud') acc.soundcloud = p.url;
        else if (p.platform === 'youtube') acc.youtube = p.url;
        return acc;
      },
      {} as { spotify?: string; soundcloud?: string; youtube?: string }
    );

    const { fetchThumbnailFromPlatforms } = await import('@/lib/utils/fetchThumbnailFromPlatforms');
    const thumbnailResult = await fetchThumbnailFromPlatforms(platformUrls);

    if (thumbnailResult) {
      logger.debug(
        `API MUSIC - Image trouvée depuis ${thumbnailResult.source}: ${thumbnailResult.url}`
      );
      return thumbnailResult.url;
    }
    return undefined;
  } catch (err) {
    logger.warn('API MUSIC - Erreur récupération image depuis plateformes:', err);
    // On continue, on essaiera thumbnailUrl si fourni
    return undefined;
  }
}

/** Télécharge la miniature, la convertit en WebP si possible et la sauvegarde. Renvoie l'id sauvegardé. */
async function downloadAndSaveThumbnail(thumbnailUrl: string): Promise<string | null> {
  try {
    const imageId = generateImageId();
    const response = await fetch(thumbnailUrl);
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
      logger.debug(`API MUSIC - Image sauvegardée avec succès: ${savedImageId}`);
      return savedImageId;
    }
    logger.warn("API MUSIC - Échec de la sauvegarde de l'image, continuation sans image");
    return null;
  } catch (err) {
    logger.error('API MUSIC - Erreur import thumbnail', err);
    // On continue sans image si erreur
    return null;
  }
}

/** Lien vers l'utilisateur créateur, seulement s'il existe encore en base. */
async function buildUserConnect(userId: string): Promise<{ User?: { connect: { id: string } } }> {
  try {
    const userExists = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true },
    });
    if (userExists) {
      return { User: { connect: { id: userId } } };
    }
  } catch (userError) {
    logger.error('Erreur vérification utilisateur', userError);
  }
  return {};
}

/** Crée la piste (genres, plateformes, créateur) puis la relit avec ses relations. */
async function createTrackInTransaction(
  tx: PrismaTxClient,
  data: TrackPayload,
  userId: string,
  processedPublishAt: Date | undefined | null
) {
  // Handle optional genreNames
  const genres = isNotEmpty(data.genreNames)
    ? await Promise.all(
        data.genreNames.map((name: string) => {
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

  const userConnect = await buildUserConnect(userId);

  // Handle optional genres connection
  const genresToConnect = isNotEmpty(genres)
    ? genres.map((genre) => ({
        Genre: { connect: { id: genre.id } },
      }))
    : undefined;

  // Handle optional platforms creation
  const platformsToCreate = isNotEmpty(data.platforms)
    ? data.platforms.map((platform) => ({
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
      title: data.title,
      artist: data.artist,
      releaseDate: new Date(data.releaseDate),
      imageId: data.imageId,
      bpm: data.bpm,
      musicalKey: data.musicalKey,
      description: data.description,
      type: data.type,
      featured: data.featured || false,
      // Publication programmée plus tard : le morceau reste caché jusqu'à publishAt
      isPublished: !isScheduledInFuture(processedPublishAt),
      ...(processedPublishAt !== undefined && { publishAt: processedPublishAt }),
      updatedAt: new Date(),
      ...userConnect,
      MusicCollection: data.collectionId ? { connect: { id: data.collectionId } } : undefined,
      ...(platformsToCreate && { TrackPlatform: { create: platformsToCreate } }),
      ...(genresToConnect && { GenresOnTracks: { create: genresToConnect } }),
    },
  });

  return tx.track.findUniqueOrThrow({
    where: { id: newTrack.id },
    include: {
      TrackPlatform: true,
      GenresOnTracks: { include: { Genre: true } },
      MusicCollection: true,
      User: { select: { id: true, name: true } },
    },
  });
}

// POST /api/music - Créer une nouvelle piste
export async function POST(request: NextRequest): Promise<Response> {
  // Rate limiting
  const { rateLimit } = await import('@/lib/api/rateLimiter');
  const rateLimitResponse = await rateLimit(request, 30); // 30 req/min pour les créations
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Réservé aux admins
  const { session, error: authError } = await requireAdmin({
    onAnonymous: () => createUnauthorizedResponse('Unauthorized'),
    onNonAdmin: () => createForbiddenResponse('Insufficient permissions'),
  });
  if (authError) return authError;

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
  const processedPublishAt = parsePublishAt(data);

  // Supprimer publishAt du DTO Zod car il est traité et sera passé séparément à Prisma
  const { publishAt, ...dataForPrisma } = data;

  // Si pas d'imageId mais qu'on a des plateformes, essayer de récupérer l'image depuis les plateformes
  if (!dataForPrisma.imageId && !dataForPrisma.thumbnailUrl && dataForPrisma.platforms) {
    const thumbnailUrl = await findThumbnailFromPlatforms(dataForPrisma.platforms);
    if (thumbnailUrl) {
      dataForPrisma.thumbnailUrl = thumbnailUrl;
    }
  }

  // Si on a une thumbnailUrl (fournie ou récupérée depuis les plateformes), la télécharger et sauvegarder
  if (!dataForPrisma.imageId && dataForPrisma.thumbnailUrl) {
    const savedImageId = await downloadAndSaveThumbnail(dataForPrisma.thumbnailUrl);
    if (savedImageId) {
      dataForPrisma.imageId = savedImageId;
    }
  }

  try {
    const track = await prisma.$transaction((tx: PrismaTxClient) =>
      createTrackInTransaction(tx, dataForPrisma, session.user.id, processedPublishAt)
    );

    // Envoyer un webhook pour la création
    const { sendWebhook } = await import('@/lib/api/webhooks');
    await sendWebhook(
      'music.created',
      {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
      },
      {
        userId: session.user.id,
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
