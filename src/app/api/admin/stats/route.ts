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
    const { searchParams } = request.nextUrl;
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
    // Paralléliser toutes les requêtes pour améliorer les performances
    const [usersCount, recentUsersResult, eventsCount, recentEvents, tracksCount, recentTracks] =
      await Promise.all([
        // Nombre total d'utilisateurs
        prisma.user.count(),
        // Utilisateurs créés depuis startDate (requête SQL optimisée)
        prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "User" 
        WHERE "createdAt" >= ${startDate} 
      `,
        // Nombre total d'événements
        prisma.event.count(),
        // Événements créés depuis startDate
        prisma.event.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
        // Nombre total de morceaux
        prisma.track.count(),
        // Morceaux créés depuis startDate
        prisma.track.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
      ]);

    const recentUsers = Number(recentUsersResult[0]?.count || 0);

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
