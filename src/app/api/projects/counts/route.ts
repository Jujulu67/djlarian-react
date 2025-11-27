import { NextRequest } from 'next/server';
import { unstable_cache } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

// GET /api/projects/counts - Récupère uniquement les comptes/totaux (léger et rapide)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Pour admin uniquement
    const all = searchParams.get('all') === 'true'; // Pour admin - voir tous les projets

    // Construire la clause WHERE pour les agrégats
    const whereClause: {
      userId?: string;
    } = {};

    // Si admin et demande tous les projets ou un utilisateur spécifique
    if (session.user.role === 'ADMIN' && (all || userId)) {
      if (userId) {
        whereClause.userId = userId;
      }
      // Si all=true, pas de filtre userId
    } else {
      // Utilisateur normal : ses propres projets uniquement
      whereClause.userId = session.user.id;
    }

    // Fonction de récupération des comptes avec cache
    const getCachedCounts = unstable_cache(
      async () => {
        // Utiliser des agrégats SQL pour éviter de charger tous les projets
        const [totalCount, statusCounts] = await Promise.all([
          // Total de projets
          prisma.project.count({
            where: whereClause,
          }),
          // Comptes par statut en une seule requête avec groupBy
          prisma.project.groupBy({
            by: ['status'],
            where: whereClause,
            _count: {
              status: true,
            },
          }),
        ]);

        // Transformer les résultats groupBy en objet
        const statusBreakdown: Record<string, number> = {
          TERMINE: 0,
          EN_COURS: 0,
          ANNULE: 0,
          A_REWORK: 0,
          GHOST_PRODUCTION: 0,
        };

        statusCounts.forEach((item) => {
          statusBreakdown[item.status] = item._count.status;
        });

        return {
          total: totalCount,
          statusBreakdown,
        };
      },
      [`projects-counts-${session.user.id}-${userId || 'all'}-${all ? 'true' : 'false'}`],
      {
        revalidate: 300, // Cache de 5 minutes
        tags: [`projects-counts-${session.user.id}`],
      }
    );

    const counts = await getCachedCounts();

    return createSuccessResponse(counts);
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/counts');
  }
}
