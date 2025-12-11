/**
 * Outil IA updateProjects - Mise à jour de projets
 */
import { tool } from 'ai';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { buildWhereClause, buildUpdateData } from './tool-helpers';

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
  });

  return tool({
    description:
      "Met à jour des projets selon des critères (progression, statut, deadline). Les projets sont automatiquement filtrés pour l'utilisateur connecté.",
    parameters,
    // @ts-expect-error - SDK AI v5 type inference issue
    execute: async (params: {
      minProgress?: number;
      maxProgress?: number;
      newDeadline?: string;
      newStatus?: string;
    }) => {
      const { minProgress, maxProgress, newDeadline, newStatus } = params;
      // Obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
      const targetUserId = await getTargetUserId(normalizedInput);

      // Construire la clause WHERE
      const whereClause = buildWhereClause(targetUserId, minProgress, maxProgress);

      // Construction de la mise à jour
      let data: any;
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
        console.log('[TEST MODE] Simulation de mise à jour:', {
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
