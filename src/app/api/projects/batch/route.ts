import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProjects } from '@/lib/utils/serializeProject';
import { ProjectStatus } from '@/components/projects/types';

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
}

interface BatchCreateResult {
  success: boolean;
  created: number;
  failed: number;
  projects: any[];
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
      },
    });

    // Créer un Set des noms existants (normalisés en lowercase pour comparaison)
    const existingNames = new Set(existingProjects.map((p) => p.name.trim().toLowerCase()));

    const result: BatchCreateResult = {
      success: true,
      created: 0,
      failed: 0,
      projects: [],
      errors: [],
    };

    // Valider chaque projet avant de créer
    const validProjects: Array<{ data: any; index: number; isUpdate?: boolean }> = [];

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

      // Vérifier si le projet existe déjà (comparaison case-insensitive)
      const normalizedName = projectData.name.trim().toLowerCase();
      if (existingNames.has(normalizedName)) {
        if (overwriteDuplicates) {
          // Si on veut écraser, ajouter à la liste des projets à mettre à jour
          validProjects.push({ data: projectData, index: i, isUpdate: true });
        } else {
          result.errors.push({
            index: i,
            data: projectData,
            error: `Un projet avec le nom "${projectData.name.trim()}" existe déjà`,
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
    const projectsToUpdateMap = new Map<string, string>(); // normalizedName -> projectId
    if (projectsToUpdate.length > 0) {
      // Récupérer tous les projets de l'utilisateur pour faire une correspondance case-insensitive
      const allUserProjects = await prisma.project.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Créer un map des noms normalisés vers les IDs
      allUserProjects.forEach((p) => {
        projectsToUpdateMap.set(p.name.trim().toLowerCase(), p.id);
      });
    }

    // Créer et mettre à jour les projets en batch avec Prisma
    // Utiliser une transaction pour garantir la cohérence, mais créer séquentiellement pour préserver l'ordre
    const createdProjects: any[] = [];
    const updatedProjects: any[] = [];

    // Calculer l'ordre de départ pour les nouveaux projets
    const maxOrderProject = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let currentOrder = (maxOrderProject?.order ?? -1) + 1;

    // Créer les projets séquentiellement dans une transaction pour préserver l'ordre d'import
    await prisma.$transaction(async (tx) => {
      for (const { data } of projectsToCreate) {
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
            externalLink: data.externalLink?.trim() || null,
            streamsJ7: data.streamsJ7 ? parseInt(String(data.streamsJ7), 10) : null,
            streamsJ14: data.streamsJ14 ? parseInt(String(data.streamsJ14), 10) : null,
            streamsJ21: data.streamsJ21 ? parseInt(String(data.streamsJ21), 10) : null,
            streamsJ28: data.streamsJ28 ? parseInt(String(data.streamsJ28), 10) : null,
            streamsJ56: data.streamsJ56 ? parseInt(String(data.streamsJ56), 10) : null,
            streamsJ84: data.streamsJ84 ? parseInt(String(data.streamsJ84), 10) : null,
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
        createdProjects.push(project);
      }

      // Mettre à jour les projets existants
      for (const { data } of projectsToUpdate) {
        const normalizedName = data.name.trim().toLowerCase();
        const projectId = projectsToUpdateMap.get(normalizedName);
        if (!projectId) {
          throw new Error(`Projet "${data.name.trim()}" introuvable pour mise à jour`);
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
            externalLink: data.externalLink?.trim() || null,
            streamsJ7: data.streamsJ7 ? parseInt(String(data.streamsJ7), 10) : null,
            streamsJ14: data.streamsJ14 ? parseInt(String(data.streamsJ14), 10) : null,
            streamsJ21: data.streamsJ21 ? parseInt(String(data.streamsJ21), 10) : null,
            streamsJ28: data.streamsJ28 ? parseInt(String(data.streamsJ28), 10) : null,
            streamsJ56: data.streamsJ56 ? parseInt(String(data.streamsJ56), 10) : null,
            streamsJ84: data.streamsJ84 ? parseInt(String(data.streamsJ84), 10) : null,
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
        updatedProjects.push(updated);
      }
    });

    // Combiner les projets créés et mis à jour (créés en premier pour préserver l'ordre)
    const allProjects = [...createdProjects, ...updatedProjects];

    const serializedProjects = serializeProjects(allProjects);
    result.created = serializedProjects.length;
    result.projects = serializedProjects;

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

    return createSuccessResponse(
      result,
      200,
      `Import terminé : ${result.created} projet(s) créé(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}`
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/batch');
  }
}
