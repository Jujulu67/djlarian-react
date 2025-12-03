import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProjects, serializeProject } from '@/lib/utils/serializeProject';
import { Project } from '@/components/projects/types';
import { ProjectStatus } from '@/components/projects/types';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-counts-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-statistics-${userId}`);
}

interface BatchProjectData {
  name: string;
  style?: string | null;
  status?: ProjectStatus;
  collab?: string | null;
  label?: string | null;
  labelFinal?: string | null;
  releaseDate?: string | null;
  externalLink?: string | null;
  streamsJ7?: number | null;
  streamsJ14?: number | null;
  streamsJ21?: number | null;
  streamsJ28?: number | null;
  streamsJ56?: number | null;
  streamsJ84?: number | null;
  streamsJ180?: number | null;
  streamsJ365?: number | null;
}

interface BatchCreateResult {
  success: boolean;
  created: number;
  failed: number;
  projects: Project[];
  errors: Array<{ index: number; data: BatchProjectData; error: string }>;
  duplicatesExcluded?: number;
}

// POST /api/projects/batch - Crée plusieurs projets en batch
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Vérifier que l'utilisateur existe bien dans la base de données
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      return createUnauthorizedResponse(
        "L'utilisateur de la session n'existe pas dans la base de données. Veuillez vous reconnecter."
      );
    }

    const body = await request.json();
    const { projects: projectsData, overwriteDuplicates = false } = body;

    if (!Array.isArray(projectsData) || projectsData.length === 0) {
      return createBadRequestResponse('Un tableau de projets est requis');
    }

    if (projectsData.length > 100) {
      return createBadRequestResponse('Maximum 100 projets par import');
    }

    // Récupérer les projets existants de l'utilisateur pour vérifier les doublons
    const existingProjects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        name: true,
        status: true,
      },
    });

    // Créer un Set des clés existantes (nom + statut, normalisés en lowercase pour comparaison)
    const existingKeys = new Set(
      existingProjects.map((p) => `${p.name.trim().toLowerCase()}|${p.status || 'EN_COURS'}`)
    );

    const result: BatchCreateResult = {
      success: true,
      created: 0,
      failed: 0,
      projects: [],
      errors: [],
    };

    // Valider chaque projet avant de créer
    const validProjects: Array<{
      data: BatchProjectData & { userId: string };
      index: number;
      isUpdate?: boolean;
    }> = [];

    for (let i = 0; i < projectsData.length; i++) {
      const projectData = projectsData[i];

      // Validation basique
      if (
        !projectData.name ||
        typeof projectData.name !== 'string' ||
        projectData.name.trim() === ''
      ) {
        result.errors.push({
          index: i,
          data: projectData,
          error: 'Le nom du projet est requis',
        });
        result.failed++;
        continue;
      }

      // Vérifier si le projet existe déjà (comparaison case-insensitive sur nom + statut)
      const normalizedName = projectData.name.trim().toLowerCase();
      const projectStatus = projectData.status || 'EN_COURS';
      const projectKey = `${normalizedName}|${projectStatus}`;
      if (existingKeys.has(projectKey)) {
        if (overwriteDuplicates) {
          // Si on veut écraser, ajouter à la liste des projets à mettre à jour
          validProjects.push({ data: projectData, index: i, isUpdate: true });
        } else {
          result.errors.push({
            index: i,
            data: projectData,
            error: `Un projet avec le nom "${projectData.name.trim()}" et le statut "${projectStatus}" existe déjà`,
          });
          result.failed++;
        }
        continue;
      }

      validProjects.push({ data: projectData, index: i });
    }

    // Si aucune donnée valide, retourner les erreurs
    if (validProjects.length === 0) {
      return createBadRequestResponse('Aucun projet valide à créer', {
        errors: result.errors,
      });
    }

    // Séparer les projets à créer et ceux à mettre à jour
    const projectsToCreate = validProjects.filter((p) => !p.isUpdate);
    const projectsToUpdate = validProjects.filter((p) => p.isUpdate);

    // Récupérer les IDs des projets à mettre à jour
    const projectsToUpdateMap = new Map<string, string>(); // projectKey (nom|statut) -> projectId
    if (projectsToUpdate.length > 0) {
      // Récupérer tous les projets de l'utilisateur pour faire une correspondance case-insensitive
      const allUserProjects = await prisma.project.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      // Créer un map des clés (nom + statut) normalisées vers les IDs
      allUserProjects.forEach((p) => {
        const projectKey = `${p.name.trim().toLowerCase()}|${p.status || 'EN_COURS'}`;
        projectsToUpdateMap.set(projectKey, p.id);
      });
    }

    // Créer et mettre à jour les projets en batch avec Prisma
    // Utiliser une transaction pour garantir la cohérence, mais créer séquentiellement pour préserver l'ordre
    const createdProjects: Project[] = [];
    const updatedProjects: Project[] = [];

    // Calculer l'ordre de départ pour les nouveaux projets
    const maxOrderProject = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let currentOrder = (maxOrderProject?.order ?? -1) + 1;

    // Fonction helper pour parser les valeurs de streams avec validation
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

    // Importer les fonctions de validation URL
    const { isValidUrl, sanitizeUrl } = await import('@/lib/utils/validateUrl');

    // Créer les projets séquentiellement dans une transaction pour préserver l'ordre d'import
    // Timeout augmenté à 30 secondes pour gérer les imports batch volumineux
    await prisma.$transaction(
      async (tx) => {
        for (const { data, index } of projectsToCreate) {
          // Valider externalLink si fourni
          if (data.externalLink && data.externalLink.trim() !== '') {
            if (!isValidUrl(data.externalLink, false)) {
              result.errors.push({
                index,
                data,
                error: "L'URL externe fournie n'est pas valide",
              });
              result.failed++;
              continue;
            }
          }

          const project = await tx.project.create({
            data: {
              userId: session.user.id,
              order: currentOrder++,
              name: data.name.trim(),
              style: data.style?.trim() || null,
              status: data.status || 'EN_COURS',
              collab: data.collab?.trim() || null,
              label: data.label?.trim() || null,
              labelFinal: data.labelFinal?.trim() || null,
              releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
              externalLink: data.externalLink ? sanitizeUrl(data.externalLink.trim()) : null,
              streamsJ7: parseStreamValue(data.streamsJ7),
              streamsJ14: parseStreamValue(data.streamsJ14),
              streamsJ21: parseStreamValue(data.streamsJ21),
              streamsJ28: parseStreamValue(data.streamsJ28),
              streamsJ56: parseStreamValue(data.streamsJ56),
              streamsJ84: parseStreamValue(data.streamsJ84),
              streamsJ180: parseStreamValue(data.streamsJ180),
              streamsJ365: parseStreamValue(data.streamsJ365),
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
          createdProjects.push(serializeProject(project));
        }

        // Mettre à jour les projets existants
        for (const { data } of projectsToUpdate) {
          const normalizedName = data.name.trim().toLowerCase();
          const projectStatus = data.status || 'EN_COURS';
          const projectKey = `${normalizedName}|${projectStatus}`;
          const projectId = projectsToUpdateMap.get(projectKey);
          if (!projectId) {
            throw new Error(
              `Projet "${data.name.trim()}" avec statut "${projectStatus}" introuvable pour mise à jour`
            );
          }
          const updated = await tx.project.update({
            where: { id: projectId },
            data: {
              name: data.name.trim(),
              style: data.style?.trim() || null,
              status: data.status || 'EN_COURS',
              collab: data.collab?.trim() || null,
              label: data.label?.trim() || null,
              labelFinal: data.labelFinal?.trim() || null,
              releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
              externalLink: data.externalLink ? sanitizeUrl(data.externalLink.trim()) : null,
              streamsJ7: parseStreamValue(data.streamsJ7),
              streamsJ14: parseStreamValue(data.streamsJ14),
              streamsJ21: parseStreamValue(data.streamsJ21),
              streamsJ28: parseStreamValue(data.streamsJ28),
              streamsJ56: parseStreamValue(data.streamsJ56),
              streamsJ84: parseStreamValue(data.streamsJ84),
              streamsJ180: parseStreamValue(data.streamsJ180),
              streamsJ365: parseStreamValue(data.streamsJ365),
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
          updatedProjects.push(serializeProject(updated));
        }
      },
      {
        maxWait: 30000, // 30 secondes d'attente maximum pour acquérir le verrou
        timeout: 30000, // 30 secondes de timeout pour la transaction complète
      }
    );

    // Les projets sont déjà sérialisés
    result.created = createdProjects.length;
    result.projects = [...createdProjects, ...updatedProjects];

    // Compter les doublons (projets qui existent déjà en base)
    const duplicatesFromDb = result.errors.filter((err) =>
      err.error.includes('existe déjà')
    ).length;

    if (duplicatesFromDb > 0) {
      result.duplicatesExcluded = duplicatesFromDb;
    }

    // Si certaines créations ont échoué, marquer comme partiellement réussi
    if (result.failed > 0) {
      result.success = false;
    }

    // Invalider le cache après import batch
    invalidateProjectsCache(session.user.id);

    return createSuccessResponse(
      result,
      200,
      `Import terminé : ${result.created} projet(s) créé(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}`
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/batch');
  }
}
