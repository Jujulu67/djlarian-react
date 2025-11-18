import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

import { subDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Prisma } from '@prisma/client';

// Define Period type
type Period = 'daily' | 'weekly' | 'monthly';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions administrateur
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Lire la période depuis les paramètres de requête, défaut sur 'daily'
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as Period) || 'daily';

    // Calculer la date de début en fonction de la période
    let startDate: Date;
    const now = new Date();
    switch (period) {
      case 'daily':
        startDate = subDays(now, 1); // Dernières 24 heures
        break;
      case 'weekly':
        startDate = subDays(now, 7); // 7 derniers jours
        break;
      case 'monthly':
      default:
        startDate = subDays(now, 30); // 30 derniers jours (ou startOfMonth(now) si préféré)
        break;
    }
    const formattedStartDate = startDate.toISOString();

    // Obtenir le nombre total d'utilisateurs
    const usersCount = await prisma.user.count();

    // Utilisateurs créés depuis startDate
    // Utiliser $queryRaw pour exécuter une requête SQL directe
    // Passer l'objet Date directement, Prisma le gère
    const recentUsersResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "User" 
      WHERE "createdAt" >= ${startDate} 
    `;
    const recentUsers = Number((recentUsersResult as any)[0]?.count || 0);

    // Obtenir le nombre total d'événements
    const eventsCount = await prisma.event.count();

    // Événements créés depuis startDate
    const recentEvents = await prisma.event.count({
      where: {
        createdAt: {
          gte: startDate, // Utiliser l'objet Date ici
        },
      },
    });

    // Obtenir le nombre total de morceaux
    const tracksCount = await prisma.track.count();

    // Morceaux créés depuis startDate
    const recentTracks = await prisma.track.count({
      where: {
        createdAt: {
          gte: startDate, // Utiliser l'objet Date ici
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

    // Pas besoin de bloc fallback complexe ici, juste retourner une erreur 500
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la récupération des statistiques Prisma' },
      { status: 500 }
    );
  }
}
