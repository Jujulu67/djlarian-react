import prisma from '@/lib/prisma';
import { MusicPlatform, MusicType } from '@/lib/utils/types';
import { Genre } from '@prisma/client';

export type CreateTrackInput = {
  title: string;
  artist: string;
  releaseDate: string;
  coverUrl?: string;
  bpm?: number;
  description?: string;
  type: MusicType;
  featured?: boolean;
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
}

// Récupérer une piste par ID
export async function getTrackById(id: string) {
  return prisma.track.findUnique({
    where: { id },
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
}

// Créer une nouvelle piste
export async function createTrack(data: CreateTrackInput, userId?: string) {
  // Créer ou obtenir les genres
  const genrePromises = data.genreNames.map(async (name) => {
    const normalizedName = name.trim().toLowerCase();
    return prisma.genre.upsert({
      where: { name: normalizedName },
      update: {},
      create: { name: normalizedName },
    });
  });

  const genres = await Promise.all(genrePromises);

  // Créer la piste avec les relations
  return prisma.track.create({
    data: {
      title: data.title,
      artist: data.artist,
      releaseDate: new Date(data.releaseDate),
      coverUrl: data.coverUrl,
      bpm: data.bpm,
      description: data.description,
      type: data.type,
      featured: data.featured || false,
      userId: userId,
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
        create: genres.map((genre: Genre) => ({
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
    },
  });
}

// Mettre à jour une piste existante
export async function updateTrack(data: UpdateTrackInput) {
  const { id, genreNames, platforms, ...trackData } = data;

  // Mettre à jour les données de base de la piste
  const trackUpdateData: any = { ...trackData };
  if (trackData.releaseDate) {
    trackUpdateData.releaseDate = new Date(trackData.releaseDate);
  }

  // Gérer les mises à jour des genres
  let genreUpdates = {};
  if (genreNames && genreNames.length > 0) {
    // Supprimer les associations de genres existantes
    await prisma.genresOnTracks.deleteMany({
      where: { trackId: id },
    });

    // Ajouter les nouveaux genres
    const genrePromises = genreNames.map(async (name) => {
      const normalizedName = name.trim().toLowerCase();
      return prisma.genre.upsert({
        where: { name: normalizedName },
        update: {},
        create: { name: normalizedName },
      });
    });

    const genres = await Promise.all(genrePromises);

    genreUpdates = {
      create: genres.map((genre: Genre) => ({
        genre: {
          connect: { id: genre.id },
        },
      })),
    };
  }

  // Gérer les mises à jour des plateformes
  let platformUpdates = {};
  if (platforms && platforms.length > 0) {
    // Supprimer les plateformes existantes
    await prisma.trackPlatform.deleteMany({
      where: { trackId: id },
    });

    // Ajouter les nouvelles plateformes
    platformUpdates = {
      create: platforms.map((platform) => ({
        platform: platform.platform,
        url: platform.url,
        embedId: platform.embedId,
      })),
    };
  }

  // Effectuer la mise à jour
  return prisma.track.update({
    where: { id },
    data: {
      ...trackUpdateData,
      genres: genreNames ? genreUpdates : undefined,
      platforms: platforms ? platformUpdates : undefined,
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
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl || '',
    releaseDate: track.releaseDate.toISOString().split('T')[0],
    genre: track.genres.map((g: any) => g.genre.name),
    bpm: track.bpm || undefined,
    description: track.description || '',
    type: track.type as MusicType,
    featured: track.featured || false,
    collection: track.collection,
    platforms: track.platforms.reduce((acc: any, platform: any) => {
      acc[platform.platform] = {
        url: platform.url,
        embedId: platform.embedId,
      };
      return acc;
    }, {}),
  };
}
