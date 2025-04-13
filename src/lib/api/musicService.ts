import prisma from '@/lib/prisma';
import { MusicPlatform, MusicType } from '@/lib/utils/types';
import { Genre } from '@prisma/client';

export type CreateTrackInput = {
  title: string;
  artist: string;
  releaseDate: string;
  coverUrl?: string;
  originalImageUrl?: string;
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
      coverUrl: data.coverUrl,
      bpm: data.bpm,
      description: data.description,
      type: data.type,
      featured: data.featured || false,
      ...(userId ? { User: { connect: { id: userId } } } : {}),
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
  const trackUpdateData: any = { ...trackData };
  if (trackData.releaseDate) {
    trackUpdateData.releaseDate = new Date(trackData.releaseDate);
  }

  // Gérer les mises à jour des genres
  let genreUpdates = {};
  if (genreNames && genreNames.length > 0) {
    await prisma.genresOnTracks.deleteMany({
      where: { trackId: id },
    });
    const genrePromises = genreNames.map(async (name) => {
      const normalizedName = name.trim().toLowerCase();
      return prisma.genre.upsert({
        where: { name: normalizedName },
        update: {},
        create: { name: normalizedName } as any,
      });
    });
    const genres = await Promise.all(genrePromises);
    genreUpdates = {
      create: genres.map((genre: Genre) => ({
        Genre: {
          connect: { id: genre.id },
        },
      })),
    };
  }

  // Gérer les mises à jour des plateformes
  let platformUpdates = {};
  if (platforms && platforms.length > 0) {
    await prisma.trackPlatform.deleteMany({
      where: { trackId: id },
    });
    platformUpdates = {
      create: platforms.map((platform) => ({
        platform: platform.platform,
        url: platform.url,
        embedId: platform.embedId,
      })) as any,
    };
  }

  // Effectuer la mise à jour
  return prisma.track.update({
    where: { id },
    data: {
      ...trackUpdateData,
      GenresOnTracks: genreNames ? genreUpdates : undefined,
      TrackPlatform: platforms ? platformUpdates : undefined,
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
  // Vérifications pour rendre la fonction plus robuste
  const releaseDateStr = track.releaseDate ? track.releaseDate.toISOString().split('T')[0] : ''; // Fournir une valeur par défaut si releaseDate est null/undefined

  // Utiliser les clés PascalCase pour lire les données de Prisma
  const genresList = Array.isArray(track.GenresOnTracks) // <-- Corrigé: genres -> GenresOnTracks
    ? track.GenresOnTracks.map((g: any) => g?.Genre?.name).filter(Boolean) // <-- Corrigé: genre -> Genre
    : []; // Tableau vide si track.GenresOnTracks n'est pas un tableau

  const platformsMap = Array.isArray(track.TrackPlatform) // <-- Corrigé: platforms -> TrackPlatform
    ? track.TrackPlatform.reduce((acc: any, platform: any) => {
        if (platform?.platform) {
          // Vérifier que platform et platform.platform existent
          acc[platform.platform] = {
            url: platform.url || '', // Fournir des valeurs par défaut
            embedId: platform.embedId,
          };
        }
        return acc;
      }, {})
    : {}; // Objet vide si track.TrackPlatform n'est pas un tableau

  // Conserver les clés camelCase pour l'objet retourné si le frontend les attend
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl || '',
    releaseDate: releaseDateStr,
    genre: genresList, // Clé de retour 'genre'
    bpm: track.bpm || undefined,
    description: track.description || '',
    type: track.type as MusicType,
    featured: track.featured || false,
    isPublished: track.isPublished !== undefined ? track.isPublished : true,
    createdAt: track.createdAt?.toISOString(), // Formatter la date pour le JSON
    platforms: platformsMap, // Clé de retour 'platforms'
    collection: track.MusicCollection // Utiliser MusicCollection pour lire
      ? { id: track.MusicCollection.id, title: track.MusicCollection.title }
      : null,
    user: track.User // Utiliser User pour lire
      ? { id: track.User.id, name: track.User.name }
      : null,
  };
}
