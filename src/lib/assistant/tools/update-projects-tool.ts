/**
 * Outil IA updateProjects - Mise à jour de projets
 */
import { tool } from 'ai';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { buildWhereClause, buildUpdateData, findProjectByName } from './tool-helpers';
import { generateNoteFromContent } from '../parsers/note-generator';

export interface UpdateProjectsToolParams {
  getTargetUserId: (query?: string) => Promise<string>;
  normalizedInput: string;
  isTestMode: boolean;
}

/**
 * Crée l'outil updateProjects pour les modifications
 */
export function createUpdateProjectsTool({
  getTargetUserId,
  normalizedInput,
  isTestMode,
}: UpdateProjectsToolParams) {
  const parameters = z.object({
    minProgress: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Progression minimum en pourcentage (0-100)'),
    maxProgress: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Progression maximum en pourcentage (0-100)'),
    newDeadline: z
      .string()
      .optional()
      .describe(
        'Nouvelle deadline au format ISO (YYYY-MM-DD) ou date relative (demain, semaine prochaine, etc.)'
      ),
    newStatus: z
      .enum(['EN_COURS', 'TERMINE', 'ANNULE', 'A_REWORK', 'GHOST_PRODUCTION', 'ARCHIVE'])
      .optional()
      .describe('Nouveau statut du projet'),
    projectName: z
      .string()
      .optional()
      .describe('Nom du projet pour ajouter une note (utilisé avec newNote)'),
    newNote: z
      .string()
      .optional()
      .describe('Contenu de la note à ajouter au projet (utilisé avec projectName)'),
  });

  return tool({
    description:
      "Met à jour des projets selon des critères (progression, statut, deadline). Peut aussi ajouter une note à un projet spécifique en utilisant projectName et newNote. Les projets sont automatiquement filtrés pour l'utilisateur connecté.",
    parameters,
    // @ts-expect-error - SDK AI v5 type inference issue
    execute: async (params: {
      minProgress?: number;
      maxProgress?: number;
      newDeadline?: string;
      newStatus?: string;
      projectName?: string;
      newNote?: string;
    }) => {
      const { minProgress, maxProgress, newDeadline, newStatus, projectName, newNote } = params;
      // Obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
      const targetUserId = await getTargetUserId(normalizedInput);

      // Cas spécial : ajout de note à un projet spécifique
      if (projectName && newNote) {
        // Trouver le projet par nom
        const projectMatch = await findProjectByName(projectName, targetUserId);

        if (!projectMatch) {
          // Chercher des suggestions de projets similaires
          const allProjects = await prisma.project.findMany({
            where: { userId: targetUserId },
            select: { name: true },
            take: 10,
          });

          const suggestions = allProjects
            .map((p) => p.name)
            .slice(0, 5)
            .join(', ');

          return {
            count: 0,
            message: `Aucun projet trouvé correspondant à "${projectName}".${
              suggestions ? ` Projets disponibles : ${suggestions}` : ''
            }`,
          };
        }

        // Récupérer le projet complet avec sa note actuelle
        const existingProject = await prisma.project.findUnique({
          where: { id: projectMatch.project.id },
          select: { note: true },
        });

        // Générer la nouvelle note avec le template
        const generatedNote = generateNoteFromContent(newNote);

        // Préfixer la nouvelle note AVANT la note existante (notes plus récentes en premier)
        const updatedNote = existingProject?.note
          ? `${generatedNote}\n\n---\n\n${existingProject.note}`
          : generatedNote;

        // Mode test : ne pas modifier la base de données
        if (isTestMode) {
          console.warn("[TEST MODE] Simulation d'ajout de note:", {
            projectName: projectMatch.project.name,
            generatedNote: generatedNote.substring(0, 100) + '...',
          });
          return {
            count: 1,
            message: `[MODE TEST] Simulation : Note ajoutée au projet "${projectMatch.project.name}".`,
          };
        }

        // Mettre à jour le projet avec la nouvelle note
        await prisma.project.update({
          where: { id: projectMatch.project.id },
          data: { note: updatedNote },
        });

        return {
          count: 1,
          message: `Note ajoutée au projet "${projectMatch.project.name}".`,
        };
      }

      // Cas normal : mise à jour en masse par critères
      // Construire la clause WHERE
      const whereClause = buildWhereClause(targetUserId, minProgress, maxProgress);

      // Construction de la mise à jour
      let data: Record<string, unknown>;
      try {
        data = buildUpdateData(newDeadline, newStatus);
      } catch (error) {
        if (error instanceof Error) {
          return {
            count: 0,
            message: error.message,
          };
        }
        return {
          count: 0,
          message: 'Erreur lors de la construction des données de mise à jour.',
        };
      }

      // Vérifier qu'il y a quelque chose à mettre à jour
      if (Object.keys(data).length === 0) {
        return { count: 0, message: 'Rien à mettre à jour. Aucune modification spécifiée.' };
      }

      // Mode test : ne pas modifier la base de données
      if (isTestMode) {
        // Simuler une mise à jour sans vraiment modifier
        console.warn('[TEST MODE] Simulation de mise à jour:', {
          where: whereClause,
          data: data,
        });
        // Retourner un résultat simulé réaliste
        const simulatedCount = Math.floor(Math.random() * 3) + 1; // 1-3 projets
        return {
          count: simulatedCount,
          message: `[MODE TEST] Simulation : Mise à jour réussie pour ${simulatedCount} projet(s).`,
        };
      }

      // Exécuter la mise à jour réelle
      const result = await prisma.project.updateMany({
        where: whereClause,
        data: data,
      });

      return {
        count: result.count,
        message:
          result.count > 0
            ? `Mise à jour réussie pour ${result.count} projet(s).`
            : 'Aucun projet ne correspond aux critères.',
      };
    },
  });
}
