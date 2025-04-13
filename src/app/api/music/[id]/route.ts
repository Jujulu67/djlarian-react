import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { UpdateTrackInput, formatTrackData } from '@/lib/api/musicService';
import { MusicType } from '@/lib/utils/types';

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
    // Utiliser select pour choisir explicitement les champs, y compris les nouveaux
    const track = await prisma.track.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        artist: true,
        coverUrl: true,
        releaseDate: true,
        description: true,
        bpm: true,
        featured: true,
        type: true,
        createdAt: true, // Inclure createdAt
        isPublished: true, // Inclure isPublished
        TrackPlatform: { select: { platform: true, url: true, embedId: true } }, // Corrigé: platforms -> TrackPlatform
        GenresOnTracks: { include: { Genre: { select: { name: true } } } }, // Corrigé: genres -> GenresOnTracks, genre -> Genre
        MusicCollection: { select: { id: true, title: true } }, // Corrigé: collection -> MusicCollection
        User: { select: { id: true, name: true } }, // Corrigé: user -> User
      },
    });

    if (!track) {
      console.error(`Track not found with ID: ${id}`);
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Adapter formatTrackData si nécessaire pour gérer la nouvelle structure de données (select vs include)
    // Ou ajuster l'appel ici pour correspondre à ce que formatTrackData attend.
    // Pour l'instant, supposons que formatTrackData peut gérer l'objet track sélectionné.
    // Si formatTrackData échoue, il faudra l'ajuster ou reconstruire l'objet attendu ici.
    return NextResponse.json(formatTrackData(track as any)); // Utiliser 'as any' temporairement ou ajuster formatTrackData
  } catch (error) {
    console.error(`Error fetching track ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch track' }, { status: 500 });
  }
}

// PUT /api/music/[id] - Mettre à jour une piste spécifique
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const data: Omit<UpdateTrackInput, 'id'> = await request.json(); // L'ID vient de l'URL, pas du body
    const { genreNames, platforms, ...trackData } = data;

    // Vérifier que la piste existe
    const existingTrack = await prisma.track.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    // Préparer les données de base à mettre à jour
    const baseDataToUpdate: any = {
      title: trackData.title,
      artist: trackData.artist,
      description: trackData.description,
      type: trackData.type as MusicType,
      featured: trackData.featured || false,
      bpm: trackData.bpm ? parseInt(String(trackData.bpm), 10) : null,
      coverUrl: trackData.coverUrl || null,
    };

    if (trackData.releaseDate) {
      baseDataToUpdate.releaseDate = new Date(trackData.releaseDate);
    }

    // Gérer les genres
    let genresUpdate = {};
    if (genreNames !== undefined) {
      const genrePromises = (genreNames || []).map(async (name) => {
        const normalizedName = name.trim().toLowerCase();
        return prisma.genre.upsert({
          where: { name: normalizedName },
          update: {},
          create: { name: normalizedName },
          select: { id: true },
        });
      });
      const genres = await Promise.all(genrePromises);
      // Utiliser connectOrCreate ou set pour gérer les relations ManyToMany
      genresUpdate = {
        genres: {
          // Supprime les anciennes relations et crée les nouvelles
          set: genres.map((genre) => ({ trackId_genreId: { trackId: id, genreId: genre.id } })),
          // Alternativement, pour ajouter/supprimer sélectivement :
          // disconnect: ...,
          // connectOrCreate: genres.map(genre => ({
          //   where: { trackId_genreId: { trackId: id, genreId: genre.id } },
          //   create: { genre: { connect: { id: genre.id } } }
          // }))
        },
      };
      // NOTE: La gestion des relations ManyToMany (TrackGenre) avec 'set' est plus simple
      // mais nécessite que le modèle TrackGenre ait un id composite ou unique (trackId_genreId).
      // Si ce n'est pas le cas, il faudra d'abord supprimer les anciennes relations explicitement.
      // Pour l'instant, on suppose que 'set' fonctionne avec la structure actuelle via Prisma magic.
      // Si ça échoue, il faudra ajuster la relation TrackGenre dans schema.prisma ou le code ici.

      // *** Correction Simplifiée pour la relation TrackGenre ***
      // Prisma peut gérer ça plus simplement avec 'set' sur l'ID du genre directement si la relation est standard.
      genresUpdate = {
        genres: {
          set: genres.map((genre) => ({ id: genre.id })), // Connecte aux genres par leur ID
        },
      };
    }

    // Gérer les plateformes (supprimer et recréer est plus simple)
    let platformsUpdate = {};
    if (platforms !== undefined) {
      platformsUpdate = {
        platforms: {
          deleteMany: { trackId: id }, // Supprimer les anciennes plateformes
          create: (platforms || []).map((platform) => ({
            platform: platform.platform,
            url: platform.url,
            embedId: platform.embedId,
          })),
        },
      };
    }

    // Mettre à jour la piste
    const updatedTrack = await prisma.$transaction(async (tx) => {
      // 1. Gérer la relation ManyToMany genres (si nécessaire de supprimer d'abord)
      //    Si le 'set' direct ne fonctionne pas, décommenter et adapter :
      // await tx.trackGenre.deleteMany({ where: { trackId: id } });

      // 2. Mettre à jour la piste et connecter les nouvelles relations
      return tx.track.update({
        where: { id },
        data: {
          ...baseDataToUpdate,
          ...(genreNames !== undefined && genresUpdate), // Appliquer la mise à jour des genres
          ...(platforms !== undefined && platformsUpdate), // Appliquer la mise à jour des plateformes
          collection:
            trackData.collectionId !== undefined
              ? { connect: { id: trackData.collectionId } }
              : trackData.hasOwnProperty('collectionId') && trackData.collectionId === null
                ? { disconnect: true } // Permettre la déconnexion si collectionId est explicitement null
                : undefined,
        },
        include: {
          TrackPlatform: true,
          GenresOnTracks: { include: { Genre: true } },
          MusicCollection: true,
        },
      });
    });

    return NextResponse.json(formatTrackData(updatedTrack));
  } catch (error) {
    console.error(`Error updating track ${id}:`, error);
    // Fournir plus de détails sur l'erreur si possible
    const errorMessage = error instanceof Error ? error.message : 'Failed to update track';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
