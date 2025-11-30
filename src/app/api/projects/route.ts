import { NextRequest } from 'next/server';
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

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

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-counts-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-statistics-${userId}`);
}

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
    const includeUser = searchParams.get('includeUser') !== 'false'; // Par défaut true
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined;

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

    // Créer une clé de cache unique basée sur les paramètres
    const cacheKey = `projects-${session.user.id}-${userId || 'all'}-${all ? 'true' : 'false'}-${status || 'all'}-${includeUser ? 'withUser' : 'noUser'}-${limit || 'all'}-${offset || 0}`;
    const cacheTag = `projects-${session.user.id}`;

    // Fonction de récupération avec cache
    const getCachedProjects = unstable_cache(
      async () => {
        const queryOptions: {
          where: typeof whereClause;
          orderBy: Array<{ order: 'asc' } | { createdAt: 'asc' }>;
          take?: number;
          skip?: number;
          include?: { User?: { select: { id: true; name: true; email: true } } };
        } = {
          where: whereClause,
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        };

        // Pagination optionnelle
        if (limit !== undefined) {
          queryOptions.take = limit;
        }
        if (offset !== undefined) {
          queryOptions.skip = offset;
        }

        // Inclure User seulement si nécessaire
        if (includeUser) {
          queryOptions.include = {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          };
        }

        const projects = await prisma.project.findMany(queryOptions);

        return serializeProjects(projects);
      },
      [cacheKey],
      {
        revalidate: 60, // Cache de 60 secondes
        tags: [cacheTag],
      }
    );

    const serializedProjects = await getCachedProjects();
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
      streamsJ180,
      streamsJ365,
    } = body;

    if (!name || name.trim() === '') {
      return createBadRequestResponse('Le nom du projet est requis');
    }

    // Valider externalLink si fourni
    if (externalLink && externalLink.trim() !== '') {
      const { isValidUrl, sanitizeUrl } = await import('@/lib/utils/validateUrl');
      if (!isValidUrl(externalLink, false)) {
        return createBadRequestResponse("L'URL externe fournie n'est pas valide");
      }
    }

    // Valider et parser les valeurs numériques avec limites de sécurité
    const parseStreamValue = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(parsed) || parsed < 0) {
        return null; // Rejeter les valeurs négatives ou invalides
      }
      // Limite de sécurité : max 2^31 - 1 (valeur max pour un entier 32 bits)
      if (parsed > 2147483647) {
        return null;
      }
      return parsed;
    };

    // Calculer l'ordre pour le nouveau projet (max order + 1)
    const maxOrderProject = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrderProject?.order ?? -1) + 1;

    // Sanitizer externalLink
    const { sanitizeUrl } = await import('@/lib/utils/validateUrl');
    const sanitizedExternalLink = externalLink ? sanitizeUrl(externalLink.trim()) : null;

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
        externalLink: sanitizedExternalLink,
        streamsJ7: parseStreamValue(streamsJ7),
        streamsJ14: parseStreamValue(streamsJ14),
        streamsJ21: parseStreamValue(streamsJ21),
        streamsJ28: parseStreamValue(streamsJ28),
        streamsJ56: parseStreamValue(streamsJ56),
        streamsJ84: parseStreamValue(streamsJ84),
        streamsJ180: parseStreamValue(streamsJ180),
        streamsJ365: parseStreamValue(streamsJ365),
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

    // Invalider le cache après création
    invalidateProjectsCache(session.user.id);

    return createCreatedResponse(serializedProject, 'Projet créé avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/projects');
  }
}
