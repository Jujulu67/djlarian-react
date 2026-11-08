/**
 * Outil IA getProjects - Récupération de projets (lecture seule)
 */
import { tool } from 'ai';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { parseRelativeDate } from '../parsers/date-parser';
import { detectStatusFromQuery } from '../parsers/status-detector';
import { detectProgressFromQuery } from '../parsers/progress-detector';
import { detectDeadlineFromQuery } from '../parsers/deadline-detector';
import { buildWhereClause } from './tool-helpers';
import { logger } from '@/lib/logger';

export interface GetProjectsToolParams {
  getTargetUserId: (query?: string) => Promise<string>;
  normalizedInput: string;
  isTestMode: boolean;
}

interface GetProjectsInput {
  minProgress?: number;
  maxProgress?: number;
  status?: string;
  hasDeadline?: boolean;
  deadlineDate?: string;
}

/**
 * Complète les filtres absents de l'appel de l'IA par détection dans la requête utilisateur
 */
function resolveDetectedFilters(params: GetProjectsInput, normalizedInput: string) {
  const { minProgress, maxProgress, status, hasDeadline, deadlineDate } = params;

  let finalStatus = status;
  let finalMinProgress = minProgress;
  let finalMaxProgress = maxProgress;
  let finalHasDeadline = hasDeadline;
  let finalDeadlineDate = deadlineDate;

  // Détecter le statut si non fourni ou undefined (utilise la similarité de chaînes, pas d'IA intermédiaire)
  // Même si l'IA passe status: undefined, on doit détecter automatiquement
  if (!finalStatus || finalStatus === 'undefined' || finalStatus === 'null') {
    const detectedStatus = detectStatusFromQuery(normalizedInput);
    if (detectedStatus) {
      logger.warn(
        `[Assistant] Statut détecté automatiquement: ${detectedStatus} (non fourni par l'IA ou undefined)`
      );
      finalStatus = detectedStatus as
        | 'EN_COURS'
        | 'TERMINE'
        | 'ANNULE'
        | 'A_REWORK'
        | 'GHOST_PRODUCTION'
        | 'ARCHIVE';
    }
  }

  // Détecter la progression si non fournie
  if (finalMinProgress === undefined && finalMaxProgress === undefined) {
    const detectedProgress = detectProgressFromQuery(normalizedInput);
    if (detectedProgress.minProgress !== undefined) {
      finalMinProgress = detectedProgress.minProgress;
    }
    if (detectedProgress.maxProgress !== undefined) {
      finalMaxProgress = detectedProgress.maxProgress;
    }
  }

  // Détecter les filtres de deadline si non fournis
  if (finalHasDeadline === undefined && !finalDeadlineDate) {
    const detectedDeadline = detectDeadlineFromQuery(normalizedInput);
    if (detectedDeadline.hasDeadline !== undefined) {
      finalHasDeadline = detectedDeadline.hasDeadline;
    }
    if (detectedDeadline.deadlineDate) {
      finalDeadlineDate = detectedDeadline.deadlineDate;
    }
  }

  return {
    finalStatus,
    finalMinProgress,
    finalMaxProgress,
    finalHasDeadline,
    finalDeadlineDate,
  };
}

/**
 * Projets simulés pour le mode test
 */
function buildSimulatedResult(params: GetProjectsInput) {
  const { minProgress, status, deadlineDate } = params;
  const simulatedCount = Math.floor(Math.random() * 5) + 1; // 1-5 projets
  const parsedDeadline = deadlineDate ? parseRelativeDate(deadlineDate) : null;
  return {
    count: simulatedCount,
    projects: Array.from({ length: simulatedCount }, (_, i) => ({
      id: `test-${i + 1}`,
      name: `Projet test ${i + 1}`,
      progress: minProgress ?? Math.floor(Math.random() * 100),
      status: status || 'EN_COURS',
      deadline: parsedDeadline,
      collab: i % 2 === 0 ? `Collab ${i + 1}` : null,
      style: i % 3 === 0 ? ['Techno', 'House', 'DNB'][i % 3] : null,
      releaseDate:
        i % 4 === 0 ? new Date(Date.now() + i * 86400000).toISOString().split('T')[0] : null,
    })),
    message: `J'ai trouvé ${simulatedCount} projet(s) correspondant aux critères.`,
  };
}

/**
 * Crée l'outil getProjects pour les questions (lecture seule)
 */
export function createGetProjectsTool({
  getTargetUserId,
  normalizedInput,
  isTestMode,
}: GetProjectsToolParams) {
  const parameters = z.object({
    minProgress: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Filtrer par progression minimum (0-100)'),
    maxProgress: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Filtrer par progression maximum (0-100)'),
    status: z
      .enum(['EN_COURS', 'TERMINE', 'ANNULE', 'A_REWORK', 'GHOST_PRODUCTION', 'ARCHIVE'])
      .optional()
      .describe(
        "Filtrer par statut. Utilise ce paramètre si l'utilisateur mentionne un statut (annulés, terminés, en cours, ghost production, archive, rework). " +
          "Comprends les variations et fautes : 'ghos prod' = GHOST_PRODUCTION, 'annulé' = ANNULE, 'fini' = TERMINE, etc."
      ),
    hasDeadline: z
      .boolean()
      .optional()
      .describe('Filtrer les projets qui ont une deadline (true) ou pas (false)'),
    deadlineDate: z
      .string()
      .optional()
      .describe('Filtrer par date de deadline spécifique (format ISO YYYY-MM-DD ou date relative)'),
  });

  return tool({
    description:
      "Récupère des informations sur les projets de l'utilisateur connecté. Utilise cet outil pour répondre aux QUESTIONS (combien de projets, quels projets, etc.). Ne modifie RIEN. " +
      "IMPORTANT : Si l'utilisateur mentionne un statut spécifique (annulés, terminés, en cours, ghost production, archive, rework), " +
      "tu DOIS utiliser le paramètre 'status' avec la valeur correspondante (ANNULE, TERMINE, EN_COURS, GHOST_PRODUCTION, ARCHIVE, A_REWORK). " +
      "Comprends les variations et fautes d'orthographe : 'ghos prod', 'ghost prod', 'ghost production' → GHOST_PRODUCTION, " +
      "'annulé' ou 'annulés' → ANNULE, 'terminé' ou 'fini' → TERMINE, etc.",
    inputSchema: parameters,
    execute: async (params: GetProjectsInput) => {
      const { minProgress, status, deadlineDate } = params;
      // Obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
      const targetUserId = await getTargetUserId(normalizedInput);

      // Détection intelligente des paramètres depuis la requête (fallback si l'IA ne les fournit pas)
      const {
        finalStatus,
        finalMinProgress,
        finalMaxProgress,
        finalHasDeadline,
        finalDeadlineDate,
      } = resolveDetectedFilters(params, normalizedInput);

      // Construire la clause WHERE
      const whereClause = buildWhereClause(
        targetUserId,
        finalMinProgress,
        finalMaxProgress,
        finalStatus,
        finalHasDeadline,
        finalDeadlineDate
      );

      // Mode test : retourner des données simulées
      if (isTestMode) {
        logger.warn('[TEST MODE] Simulation de lecture:', { where: whereClause });
        return buildSimulatedResult({ minProgress, status, deadlineDate });
      }

      // Lecture réelle depuis la base de données
      const projects = await prisma.project.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          progress: true,
          status: true,
          deadline: true,
          collab: true,
          style: true,
          releaseDate: true,
        },
        take: 50, // Limiter à 50 projets pour éviter de surcharger
      });

      return {
        count: projects.length,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          progress: p.progress,
          status: p.status,
          deadline: p.deadline?.toISOString().split('T')[0] || null,
          collab: p.collab || null,
          style: p.style || null,
          releaseDate: p.releaseDate?.toISOString().split('T')[0] || null,
        })),
        message: `J'ai trouvé ${projects.length} projet(s) correspondant aux critères.`,
      };
    },
  });
}
