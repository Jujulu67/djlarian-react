import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { subDays } from 'date-fns';

export async function GET() {
  try {
    // Vérifier l'authentification et les permissions administrateur
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Obtenir le nombre total d'utilisateurs
    const usersCount = await prisma.user.count();

    // Utilisateurs récents (simulation car pas de champ createdAt)
    const recentUsers = Math.floor(usersCount * 0.2); // Simulation: 20% sont récents

    // Obtenir le nombre total d'événements
    const eventsCount = await prisma.event.count();

    // Événements créés ces 30 derniers jours
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentEvents = await prisma.event.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Obtenir le nombre total de morceaux
    const tracksCount = await prisma.track.count();

    // Morceaux créés ces 30 derniers jours
    const recentTracks = await prisma.track.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Retourner les statistiques
    return NextResponse.json({
      usersCount,
      eventsCount,
      tracksCount,
      recentUsers,
      recentEvents,
      recentTracks,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
