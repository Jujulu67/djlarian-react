import prisma from '@/lib/prisma';
import { MusicPlatform, MusicType } from '@/lib/utils/types';
import { Genre } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export type CreateTrackInput = {
  title: string;
  artist: string;
  releaseDate: string;
  imageId?: string;
  bpm?: number;
  description?: string;
  type: MusicType;
  featured?: boolean;
  isPublished?: boolean;
  genreNames: string[];
  platforms: {
    platform: MusicPlatform;
    url: string;
    embedId?: string;
  }[];
  collectionId?: string;
};

export type UpdateTrackInput = {
  id: string;
} & Partial<CreateTrackInput>;

// Récupérer toutes les pistes musicales
export async function getAllTracks() {
  return prisma.track.findMany({
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
}

// Récupérer une piste par ID
export async function getTrackById(id: string) {
  return prisma.track.findUnique({
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
}

// Créer une nouvelle piste
export async function createTrack(data: CreateTrackInput, userId?: string) {
  // Créer ou obtenir les genres
  const genrePromises = data.genreNames.map(async (name) => {
    const normalizedName = name.trim().toLowerCase();
    return prisma.genre.upsert({
      where: { name: normalizedName },
      update: {},
      create: { name: normalizedName } as any,
    });
  });

  const genres = await Promise.all(genrePromises);

  // Créer la piste avec les relations
  return prisma.track.create({
    data: {
      title: data.title,
      artist: data.artist,
      releaseDate: new Date(data.releaseDate),
      imageId: data.imageId,
      bpm: data.bpm,
      description: data.description,
      type: data.type,
      featured: data.featured || false,
      updatedAt: new Date(),
      id: uuidv4(),
      ...(userId ? { User: { connect: { id: userId } } } : {}),
      MusicCollection: data.collectionId
        ? {
            connect: { id: data.collectionId },
          }
        : undefined,
      TrackPlatform: {
        create: data.platforms.map((platform) => ({
          id: uuidv4(),
          platform: platform.platform,
          url: platform.url,
          embedId: platform.embedId,
          updatedAt: new Date(),
        })) as any,
      },
      GenresOnTracks: {
        create: genres.map((genre: Genre) => ({
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
    },
  });
}

// Mettre à jour une piste existante
export async function updateTrack(data: UpdateTrackInput) {
  const { id, genreNames, platforms, ...trackData } = data;

  // Mettre à jour les données de base de la piste
  const { coverUrl, originalImageUrl, ...restTrackData } = trackData as any;
  const trackUpdateData: any = { ...restTrackData };

  if (trackUpdateData.releaseDate) {
    trackUpdateData.releaseDate = new Date(trackUpdateData.releaseDate);
  }

  // Gérer les mises à jour des genres
  let genreUpdates = undefined;
  if (genreNames !== undefined) {
    await prisma.genresOnTracks.deleteMany({ where: { trackId: id } });
    if (genreNames.length > 0) {
      const genrePromises = genreNames.map(async (name) => {
        const normalizedName = name.trim().toLowerCase();
        return prisma.genre.upsert({
          where: { name: normalizedName },
          update: {},
          create: { id: uuidv4(), name: normalizedName, updatedAt: new Date() },
          select: { id: true },
        });
      });
      const genres = await Promise.all(genrePromises);
      genreUpdates = {
        create: genres.map((genre: { id: string }) => ({
          Genre: { connect: { id: genre.id } },
        })),
      };
    } else {
      genreUpdates = { create: [] };
    }
  }

  // Gérer les mises à jour des plateformes
  let platformUpdates = undefined;
  if (platforms !== undefined) {
    await prisma.trackPlatform.deleteMany({ where: { trackId: id } });
    if (platforms.length > 0) {
      platformUpdates = {
        create: platforms.map((platform) => ({
          id: uuidv4(),
          platform: platform.platform,
          url: platform.url,
          embedId: platform.embedId,
          updatedAt: new Date(),
        })),
      };
    } else {
      platformUpdates = { create: [] };
    }
  }

  // Effectuer la mise à jour
  return prisma.track.update({
    where: { id },
    data: {
      ...trackUpdateData,
      updatedAt: new Date(),
      ...(genreUpdates !== undefined && { GenresOnTracks: genreUpdates }),
      ...(platformUpdates !== undefined && { TrackPlatform: platformUpdates }),
      MusicCollection: trackData.hasOwnProperty('collectionId')
        ? trackData.collectionId === null
          ? { disconnect: true }
          : { connect: { id: trackData.collectionId } }
        : undefined,
    },
    include: {
      TrackPlatform: true,
      GenresOnTracks: {
        include: {
          Genre: true,
        },
      },
      MusicCollection: true,
    },
  });
}

// Supprimer une piste
export async function deleteTrack(id: string) {
  // Supprimer d'abord les relations
  await prisma.genresOnTracks.deleteMany({
    where: { trackId: id },
  });

  await prisma.trackPlatform.deleteMany({
    where: { trackId: id },
  });

  // Puis supprimer la piste
  return prisma.track.delete({
    where: { id },
  });
}

// Récupérer tous les genres
export async function getAllGenres() {
  return prisma.genre.findMany({
    orderBy: { name: 'asc' },
  });
}

// Convertir les données Prisma au format attendu par le frontend
export function formatTrackData(track: any) {
  if (!track) return null;

  const formattedTrack: any = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    imageId: track.imageId,
    releaseDate: track.releaseDate?.toISOString(),
    bpm: track.bpm,
    description: track.description,
    type: track.type,
    featured: track.featured,
    isPublished: track.isPublished,
    createdAt: track.createdAt?.toISOString(),
    updatedAt: track.updatedAt?.toISOString(),
    coverUrl: track.imageId ? `/uploads/${track.imageId}.jpg` : null,
    originalImageUrl: track.imageId ? `/uploads/${track.imageId}-ori.jpg` : null,
    genre: track.GenresOnTracks?.map((gt: any) => gt.Genre?.name).filter(Boolean) || [],
    platforms: {},
    collection: track.MusicCollection
      ? { id: track.MusicCollection.id, title: track.MusicCollection.title }
      : null,
    user: track.User ? { id: track.User.id, name: track.User.name } : null,
  };

  if (track.TrackPlatform && Array.isArray(track.TrackPlatform)) {
    track.TrackPlatform.forEach((p: any) => {
      if (p.platform) {
        formattedTrack.platforms[p.platform] = { url: p.url, embedId: p.embedId };
      }
    });
  }

  return formattedTrack;
}
