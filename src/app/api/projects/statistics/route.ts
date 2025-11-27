import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

// GET /api/projects/statistics - Récupère les statistiques des projets de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Récupérer tous les projets de l'utilisateur
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Calculer le nombre total de projets
    const totalProjects = projects.length;

    // Répartition par statut
    const statusBreakdown = {
      TERMINE: projects.filter((p) => p.status === 'TERMINE').length,
      EN_COURS: projects.filter((p) => p.status === 'EN_COURS').length,
      ANNULE: projects.filter((p) => p.status === 'ANNULE').length,
      A_REWORK: projects.filter((p) => p.status === 'A_REWORK').length,
      GHOST_PRODUCTION: projects.filter((p) => p.status === 'GHOST_PRODUCTION').length,
    };

    // Projets terminés par année (seulement TERMINE et GHOST_PRODUCTION avec releaseDate)
    const projectsByYearStatus: Record<
      string,
      {
        TERMINE: number;
        GHOST_PRODUCTION: number;
        total: number;
      }
    > = {};
    const projectsByYearDetails: Record<
      string,
      Array<{ id: string; name: string; releaseDate: string }>
    > = {};

    // Projets terminés sans date de sortie (N/A)
    let naTermine = 0;
    let naGhostProd = 0;
    const naProjects: Array<{ id: string; name: string; releaseDate: string | null }> = [];

    projects
      .filter((p) => p.status === 'TERMINE' || p.status === 'GHOST_PRODUCTION')
      .forEach((p) => {
        if (!p.releaseDate) {
          // Projets sans date de sortie
          if (p.status === 'TERMINE') {
            naTermine++;
          } else if (p.status === 'GHOST_PRODUCTION') {
            naGhostProd++;
          }
          naProjects.push({
            id: p.id,
            name: p.name,
            releaseDate: null,
          });
        } else {
          // Projets avec date de sortie
          const year = new Date(p.releaseDate).getFullYear().toString();

          if (!projectsByYearStatus[year]) {
            projectsByYearStatus[year] = {
              TERMINE: 0,
              GHOST_PRODUCTION: 0,
              total: 0,
            };
          }

          if (p.status === 'TERMINE') {
            projectsByYearStatus[year].TERMINE++;
          } else if (p.status === 'GHOST_PRODUCTION') {
            projectsByYearStatus[year].GHOST_PRODUCTION++;
          }
          // Ne pas calculer le total ici, on le calculera après toutes les itérations

          // Garder les détails pour TERMINE et GHOST_PRODUCTION
          if (!projectsByYearDetails[year]) {
            projectsByYearDetails[year] = [];
          }
          projectsByYearDetails[year].push({
            id: p.id,
            name: p.name,
            releaseDate: p.releaseDate.toISOString(),
          });
        }
      });

    // Convertir en tableau pour le graphique (seulement TERMINE et GHOST_PRODUCTION)
    // Calculer le total correctement pour chaque année
    const projectsByYearArray = Object.entries(projectsByYearStatus)
      .map(([year, data]) => ({
        year,
        TERMINE: data.TERMINE,
        GHOST_PRODUCTION: data.GHOST_PRODUCTION,
        total: data.TERMINE + data.GHOST_PRODUCTION, // Calculer le total correctement
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Ajouter la barre N/A si il y a des projets sans date (à la fin après le tri)
    if (naTermine > 0 || naGhostProd > 0) {
      projectsByYearArray.push({
        year: 'N/A',
        TERMINE: naTermine,
        GHOST_PRODUCTION: naGhostProd,
        total: naTermine + naGhostProd,
      });
      projectsByYearDetails['N/A'] = naProjects.map((p) => ({
        id: p.id,
        name: p.name,
        releaseDate: p.releaseDate || '',
      }));
    }

    // Trier à nouveau pour s'assurer que N/A est à la fin
    projectsByYearArray.sort((a, b) => {
      if (a.year === 'N/A') return 1;
      if (b.year === 'N/A') return -1;
      return a.year.localeCompare(b.year);
    });

    // Trier les projets par date de sortie dans chaque année
    Object.keys(projectsByYearDetails).forEach((year) => {
      projectsByYearDetails[year].sort(
        (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
      );
    });

    // Évolution des streams par projet (projets avec au moins un stream)
    const streamsEvolution = projects
      .filter(
        (p) =>
          p.status === 'TERMINE' &&
          (p.streamsJ7 ||
            p.streamsJ14 ||
            p.streamsJ21 ||
            p.streamsJ28 ||
            p.streamsJ56 ||
            p.streamsJ84)
      )
      .map((p) => ({
        projectId: p.id,
        projectName: p.name,
        releaseDate: p.releaseDate ? new Date(p.releaseDate).toISOString() : null,
        streams: [
          { day: 7, value: p.streamsJ7 || 0 },
          { day: 14, value: p.streamsJ14 || 0 },
          { day: 21, value: p.streamsJ21 || 0 },
          { day: 28, value: p.streamsJ28 || 0 },
          { day: 56, value: p.streamsJ56 || 0 },
          { day: 84, value: p.streamsJ84 || 0 },
        ],
      }));

    // Métriques des streams
    const projectsWithStreams = projects.filter(
      (p) =>
        p.streamsJ7 || p.streamsJ14 || p.streamsJ21 || p.streamsJ28 || p.streamsJ56 || p.streamsJ84
    );

    // Calculer les moyennes pour tous les jalons
    const calculateAverage = (day: number) => {
      const fieldMap: Record<
        number,
        'streamsJ7' | 'streamsJ14' | 'streamsJ21' | 'streamsJ28' | 'streamsJ56' | 'streamsJ84'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
      };
      const field = fieldMap[day];
      const values = projectsWithStreams.map((p) => p[field] || 0).filter((s) => s > 0);
      return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    };

    const averageStreams = {
      J7: calculateAverage(7),
      J14: calculateAverage(14),
      J21: calculateAverage(21),
      J28: calculateAverage(28),
      J56: calculateAverage(56),
      J84: calculateAverage(84),
    };

    const totalStreams = projectsWithStreams.reduce((sum, p) => {
      return (
        sum +
        (p.streamsJ84 ||
          p.streamsJ56 ||
          p.streamsJ28 ||
          p.streamsJ21 ||
          p.streamsJ14 ||
          p.streamsJ7 ||
          0)
      );
    }, 0);

    const maxStreams = Math.max(
      ...projectsWithStreams.map(
        (p) =>
          p.streamsJ84 ||
          p.streamsJ56 ||
          p.streamsJ28 ||
          p.streamsJ21 ||
          p.streamsJ14 ||
          p.streamsJ7 ||
          0
      ),
      0
    );

    // Calculer les streams totaux par jalon pour le mode global
    const globalStreamsEvolution = [7, 14, 21, 28, 56, 84].map((day) => {
      const fieldMap: Record<
        number,
        'streamsJ7' | 'streamsJ14' | 'streamsJ21' | 'streamsJ28' | 'streamsJ56' | 'streamsJ84'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
      };
      const field = fieldMap[day];
      const total = projectsWithStreams.reduce((sum, p) => sum + (p[field] || 0), 0);
      return { day, value: total };
    });

    return createSuccessResponse({
      totalProjects,
      statusBreakdown,
      projectsByYear: projectsByYearArray,
      projectsByYearDetails,
      streamsEvolution,
      globalStreamsEvolution,
      metrics: {
        averageStreams,
        totalStreams,
        maxStreams,
        projectsWithStreams: projectsWithStreams.length,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/statistics');
  }
}
