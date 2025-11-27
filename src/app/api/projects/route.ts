import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createCreatedResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProjects, serializeProject } from '@/lib/utils/serializeProject';

// GET /api/projects - Liste les projets de l'utilisateur connecté (ou tous pour admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId'); // Pour admin uniquement
    const all = searchParams.get('all') === 'true'; // Pour admin - voir tous les projets

    // Construire la clause WHERE
    const whereClause: {
      userId?: string;
      status?: string;
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

    if (status) {
      whereClause.status = status;
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const serializedProjects = serializeProjects(projects);
    return createSuccessResponse(serializedProjects);
  } catch (error) {
    return handleApiError(error, 'GET /api/projects');
  }
}

// POST /api/projects - Crée un nouveau projet
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();

    const {
      name,
      style,
      status,
      collab,
      label,
      labelFinal,
      releaseDate,
      externalLink,
      streamsJ7,
      streamsJ14,
      streamsJ21,
      streamsJ28,
      streamsJ56,
      streamsJ84,
    } = body;

    if (!name || name.trim() === '') {
      return createBadRequestResponse('Le nom du projet est requis');
    }

    // Calculer l'ordre pour le nouveau projet (max order + 1)
    const maxOrderProject = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrderProject?.order ?? -1) + 1;

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        order: newOrder,
        name: name.trim(),
        style: style?.trim() || null,
        status: status || 'EN_COURS',
        collab: collab?.trim() || null,
        label: label?.trim() || null,
        labelFinal: labelFinal?.trim() || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        externalLink: externalLink?.trim() || null,
        streamsJ7: streamsJ7 ? parseInt(streamsJ7, 10) : null,
        streamsJ14: streamsJ14 ? parseInt(streamsJ14, 10) : null,
        streamsJ21: streamsJ21 ? parseInt(streamsJ21, 10) : null,
        streamsJ28: streamsJ28 ? parseInt(streamsJ28, 10) : null,
        streamsJ56: streamsJ56 ? parseInt(streamsJ56, 10) : null,
        streamsJ84: streamsJ84 ? parseInt(streamsJ84, 10) : null,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const serializedProject = serializeProject(project);
    return createCreatedResponse(serializedProject, 'Projet créé avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/projects');
  }
}
