'use server';

/**
 * Assistant IA de Gestion de Projet
 *
 * SÉCURITÉ EN PRODUCTION :
 * - ✅ Utilise uniquement Prisma directement (PAS d'appels API)
 * - ✅ Aucun accès aux APIs admin (/api/admin/*)
 * - ✅ Respecte les permissions de l'utilisateur connecté (session)
 * - ✅ Les utilisateurs USER ne peuvent accéder qu'à leurs propres projets
 * - ✅ Seuls les ADMIN peuvent accéder aux projets d'autres utilisateurs
 * - ✅ Toutes les requêtes Prisma sont filtrées par userId pour garantir l'isolation des données
 *
 * L'assistant n'a accès qu'aux fonctions publiques que l'utilisateur connecté possède déjà.
 * Il ne peut pas contourner les permissions en appelant des APIs admin.
 */

import { generateText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Configuration Groq
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// Fonction utilitaire pour convertir les dates relatives en ISO
function parseRelativeDate(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerDateStr = dateStr.toLowerCase().trim();

  if (lowerDateStr === "aujourd'hui" || lowerDateStr === 'today') {
    return today.toISOString().split('T')[0];
  }

  if (lowerDateStr === 'demain' || lowerDateStr === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (lowerDateStr === 'après-demain' || lowerDateStr === 'day after tomorrow') {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }

  if (lowerDateStr.includes('semaine prochaine') || lowerDateStr.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Si c'est déjà une date ISO, la retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

export async function processProjectCommand(userInput: string) {
  // Vérifier l'authentification
  const session = await auth();
  if (!session?.user?.id) {
    return "Erreur : Vous devez être connecté pour utiliser l'assistant.";
  }

  const currentUserId = session.user.id;
  const currentUserName = session.user.name || null; // Nom de l'utilisateur connecté (ex: "Larian67")
  const currentUserRole = session.user.role || 'USER'; // Rôle de l'utilisateur connecté
  const isAdmin = currentUserRole === 'ADMIN'; // Vérifier si l'utilisateur est admin
  const today = new Date().toISOString().split('T')[0];

  // Désactivation de la normalisation IA - elle modifie trop la requête et ne corrige pas bien les statuts
  // On se fie uniquement à detectStatusFromQuery qui est plus robuste
  const normalizedInput = userInput;

  // Fonction pour trouver un utilisateur par nom
  async function findUserByName(userName: string) {
    if (!userName) return null;
    return await prisma.user.findFirst({
      where: { name: userName },
      select: { id: true, name: true },
    });
  }

  // Fonction pour calculer la distance de Levenshtein (similarité de chaînes)
  function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[len1][len2];
  }

  // Fonction pour détecter et mapper un statut depuis la requête (utilise la similarité de chaînes)
  // Pas de requête IA intermédiaire - approche purement algorithmique
  function detectStatusFromQuery(query: string): string | null {
    const lowerQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

    const availableStatuses = [
      {
        value: 'EN_COURS',
        keywords: ['en cours', 'en cour', 'encours', 'in progress', 'ongoing'],
        minSimilarity: 0.7,
      },
      {
        value: 'TERMINE',
        keywords: [
          'terminé',
          'termine',
          'terminée',
          'terminee',
          'terminés',
          'termines',
          'fini',
          'finis',
          'finie',
          'finies',
          'done',
          'complete',
        ],
        minSimilarity: 0.6,
      },
      {
        value: 'ANNULE',
        keywords: [
          'annulé',
          'annule',
          'annulée',
          'annulee',
          'annulés',
          'annules',
          'annulées',
          'annulees',
          'annul',
          'cancel',
        ],
        minSimilarity: 0.7,
      },
      {
        value: 'A_REWORK',
        keywords: ['rework', 'à rework', 'a rework', 'rewor', 'à refaire', 'a refaire'],
        minSimilarity: 0.7,
      },
      {
        value: 'GHOST_PRODUCTION',
        keywords: ['ghost production', 'ghostprod', 'ghost prod', 'ghos prod', 'ghost', 'ghosts'],
        minSimilarity: 0.5, // Plus tolérant pour les fautes de frappe
      },
      {
        value: 'ARCHIVE',
        keywords: [
          'archivé',
          'archive',
          'archivée',
          'archivee',
          'archivés',
          'archives',
          'archivées',
          'archivees',
          'archiv',
        ],
        minSimilarity: 0.7,
      },
    ];

    // Extraire les mots de la requête
    const queryWords = lowerQuery.split(/\s+/);

    // Pour chaque statut, chercher le meilleur match
    let bestMatch: { status: string; score: number } | null = null;

    for (const status of availableStatuses) {
      for (const keyword of status.keywords) {
        const keywordLower = keyword.toLowerCase();

        // Vérifier si le mot-clé est contenu dans la requête (match exact partiel)
        if (lowerQuery.includes(keywordLower) || keywordLower.includes(lowerQuery)) {
          const score = 1.0;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { status: status.value, score };
            console.log(
              `[Assistant] Statut détecté par match exact: "${status.value}" (keyword: "${keyword}", query: "${query}")`
            );
            return status.value;
          }
        }

        // Calculer la similarité avec chaque mot de la requête
        for (const word of queryWords) {
          if (word.length < 3) continue; // Ignorer les mots trop courts

          const distance = levenshteinDistance(word, keywordLower);
          const maxLength = Math.max(word.length, keywordLower.length);
          const similarity = 1 - distance / maxLength;

          // Pour GHOST_PRODUCTION, chercher aussi des combinaisons de mots avec patterns très flexibles
          if (status.value === 'GHOST_PRODUCTION') {
            // Patterns très flexibles pour détecter "ghost production" même avec beaucoup de fautes
            // "gauspraud", "gausprod", "gauspraud", "gaustprod", etc.
            const ghostPatterns = [
              /g[ao]?[su]?[so]?t/i, // gost, gast, gaost, gausot, etc.
              /g[ao]?[su]?[sp]/i, // gausp, gasp, gaosp, etc.
              /g[ao]?[su]?[sp]r/i, // gauspr, gaspr, etc.
            ];

            const prodPatterns = [
              /pro[ds]+\w*/i, // prod, prods, prosduitss, etc.
              /praud/i, // praud (fautes de frappe)
              /prau/i, // prau
              /prod/i, // prod
            ];

            // Vérifier toutes les combinaisons
            for (const ghostPattern of ghostPatterns) {
              for (const prodPattern of prodPatterns) {
                if (ghostPattern.test(lowerQuery) && prodPattern.test(lowerQuery)) {
                  const score = 0.8;
                  if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { status: status.value, score };
                    console.log(
                      `[Assistant] Statut détecté par pattern flexible: "${status.value}" (query: "${query}")`
                    );
                    return status.value;
                  }
                }
              }
            }

            // Pattern spécial pour "gauspraud" et variations similaires
            if (/gaus?praud|gaus?prod|gaus?prau/i.test(lowerQuery)) {
              const score = 0.85;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { status: status.value, score };
                console.log(
                  `[Assistant] Statut détecté par pattern spécial: "${status.value}" (query: "${query}")`
                );
                return status.value;
              }
            }
          }

          // Si la similarité est suffisante
          if (similarity >= status.minSimilarity) {
            if (!bestMatch || similarity > bestMatch.score) {
              bestMatch = { status: status.value, score: similarity };
            }
          }
        }
      }
    }

    if (bestMatch) {
      console.log(
        `[Assistant] Statut détecté par similarité: "${bestMatch.status}" (score: ${bestMatch.score.toFixed(2)}, query: "${query}")`
      );
      return bestMatch.status;
    }

    return null;
  }

  // Fonction pour détecter les valeurs de progression depuis la requête
  function detectProgressFromQuery(query: string): { minProgress?: number; maxProgress?: number } {
    const lowerQuery = query.toLowerCase();
    const result: { minProgress?: number; maxProgress?: number } = {};

    // Patterns pour détecter les pourcentages avec différentes formulations
    // Exemples: "à 80%", "fini à 100%", "entre 50 et 75%", "plus de 80%", "moins de 50%", "inférieur à 70%"

    // D'abord, détecter "inférieur à X%", "inférieur.à X%" (avec point), ou "< à X%"
    const inferieurPatterns = [
      /inf[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
      /<\s*à\s*(\d+)\s*%/i,
      /<\s*(\d+)\s*%/i,
    ];

    for (const pattern of inferieurPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        result.maxProgress = parseInt(match[1], 10);
        console.log(`[Assistant] Progression max détectée (inférieur à): ${result.maxProgress}%`);
        return result;
      }
    }

    // Détecter "supérieur à X%", "supérieur.à X%" (avec point), ou "> à X%"
    const superieurPatterns = [
      /sup[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
      />\s*à\s*(\d+)\s*%/i,
      />\s*(\d+)\s*%/i,
    ];

    for (const pattern of superieurPatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        result.minProgress = parseInt(match[1], 10);
        console.log(`[Assistant] Progression min détectée (supérieur à): ${result.minProgress}%`);
        return result;
      }
    }

    // Patterns pour détecter les pourcentages
    const percentagePatterns = [
      // "à X%", "fini à X%", "terminé à X%"
      /(?:à|fini|terminé|finis)\s*(\d+)\s*%/i,
      // "entre X et Y%", "de X à Y%"
      /(?:entre|de)\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%/i,
      // "plus de X%", "au moins X%", "minimum X%"
      /(?:plus\s*de|au\s*moins|minimum|min)\s*(\d+)\s*%/i,
      // "moins de X%", "au plus X%", "maximum X%"
      /(?:moins\s*de|au\s*plus|maximum|max)\s*(\d+)\s*%/i,
      // "X%", "X pourcent"
      /(\d+)\s*(?:%|pourcent)/i,
    ];

    for (const pattern of percentagePatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        if (match[2]) {
          // Pattern "entre X et Y"
          result.minProgress = parseInt(match[1], 10);
          result.maxProgress = parseInt(match[2], 10);
          console.log(
            `[Assistant] Progression détectée: ${result.minProgress}% - ${result.maxProgress}%`
          );
          return result;
        } else if (
          lowerQuery.includes('plus') ||
          lowerQuery.includes('au moins') ||
          lowerQuery.includes('minimum')
        ) {
          // "plus de X%"
          result.minProgress = parseInt(match[1], 10);
          console.log(`[Assistant] Progression min détectée: ${result.minProgress}%`);
          return result;
        } else if (
          lowerQuery.includes('moins') ||
          lowerQuery.includes('au plus') ||
          lowerQuery.includes('maximum')
        ) {
          // "moins de X%"
          result.maxProgress = parseInt(match[1], 10);
          console.log(`[Assistant] Progression max détectée: ${result.maxProgress}%`);
          return result;
        } else {
          // "à X%" ou "X%"
          const value = parseInt(match[1], 10);
          // Si on dit "fini à 100%" ou "terminé à 100%", c'est minProgress = 100
          if (lowerQuery.includes('fini') || lowerQuery.includes('terminé')) {
            result.minProgress = value;
          } else {
            // Sinon, on considère que c'est une valeur exacte (min et max)
            result.minProgress = value;
            result.maxProgress = value;
          }
          console.log(`[Assistant] Progression détectée: ${value}%`);
          return result;
        }
      }
    }

    return result;
  }

  // Fonction pour détecter les filtres de deadline depuis la requête
  function detectDeadlineFromQuery(query: string): {
    hasDeadline?: boolean;
    deadlineDate?: string;
  } {
    const lowerQuery = query.toLowerCase();
    const result: { hasDeadline?: boolean; deadlineDate?: string } = {};

    // Patterns pour "avec deadline", "sans deadline", "qui ont une deadline"
    if (/avec\s*deadline|qui\s*ont\s*(?:une\s*)?deadline|deadline\s*prévue/i.test(lowerQuery)) {
      result.hasDeadline = true;
      console.log('[Assistant] Deadline détectée: hasDeadline = true');
    } else if (/sans\s*deadline|pas\s*de\s*deadline/i.test(lowerQuery)) {
      result.hasDeadline = false;
      console.log('[Assistant] Deadline détectée: hasDeadline = false');
    }

    // Patterns pour dates relatives : "vendredi", "lundi prochain", "dans 3 jours", etc.
    const datePatterns = [
      /(?:deadline|pour)\s*(?:le\s*)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
      /(?:deadline|pour)\s*(?:le\s*)?(\d{1,2})\/(\d{1,2})/i, // DD/MM
      /(?:deadline|pour)\s*(?:le\s*)?(\d{4}-\d{2}-\d{2})/i, // YYYY-MM-DD
      /(?:dans|pour)\s*(\d+)\s*(?:jour|jours)/i,
      /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*(?:prochain|prochaine)/i,
    ];

    for (const pattern of datePatterns) {
      const match = lowerQuery.match(pattern);
      if (match) {
        // Utiliser parseRelativeDate pour convertir
        const dateStr = match[0];
        const parsed = parseRelativeDate(dateStr);
        if (parsed) {
          result.deadlineDate = parsed;
          console.log(`[Assistant] Date de deadline détectée: ${result.deadlineDate}`);
          return result;
        }
      }
    }

    return result;
  }

  // Fonction pour extraire le nom d'utilisateur de la requête si mentionné
  function extractUserNameFromQuery(query: string): string | null {
    // Chercher des patterns comme "pour Larian67", "de Larian67", "Larian67", etc.
    const patterns = [
      /(?:pour|de|à|avec|les projets de)\s+([A-Za-z0-9_]+)/i,
      /^([A-Za-z0-9_]+)\s+(?:a|à|possède)/i,
      /utilisateur\s+([A-Za-z0-9_]+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const extracted = match[1];
        // Ignorer les mots communs
        if (
          !['projets', 'projet', 'deadline', 'statut', 'progression'].includes(
            extracted.toLowerCase()
          )
        ) {
          return extracted;
        }
      }
    }

    return null;
  }

  // Fonction pour obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
  // SÉCURITÉ : Seuls les ADMIN peuvent accéder aux projets d'autres utilisateurs
  async function getTargetUserId(query?: string): Promise<string> {
    // Essayer d'extraire un nom d'utilisateur de la requête
    if (query) {
      const extractedUserName = extractUserNameFromQuery(query);
      if (extractedUserName) {
        // Vérifier si l'utilisateur connecté est ADMIN
        if (!isAdmin) {
          // Si l'utilisateur n'est pas admin, vérifier si le nom mentionné correspond à l'utilisateur connecté
          if (extractedUserName.toLowerCase() !== currentUserName?.toLowerCase()) {
            // L'utilisateur essaie d'accéder aux projets d'un autre utilisateur sans être admin
            // Forcer l'utilisation de son propre ID
            console.warn(
              `[Assistant] Sécurité : Utilisateur non-admin (${currentUserName}) a tenté d'accéder aux projets de ${extractedUserName}. Accès refusé.`
            );
            return currentUserId; // Forcer l'utilisation de l'utilisateur connecté
          }
        }

        // Si admin OU si le nom correspond à l'utilisateur connecté, chercher l'utilisateur
        const targetUser = await findUserByName(extractedUserName);
        if (targetUser) {
          // Double vérification : si pas admin, s'assurer que c'est bien l'utilisateur connecté
          if (!isAdmin && targetUser.id !== currentUserId) {
            console.warn(
              `[Assistant] Sécurité : Tentative d'accès non autorisée aux projets de ${extractedUserName}.`
            );
            return currentUserId;
          }
          return targetUser.id;
        }
      }
    }

    // Par défaut, utiliser l'utilisateur connecté
    return currentUserId;
  }

  // Mode test : détecté via variable d'environnement
  const isTestMode = process.env.ASSISTANT_TEST_MODE === 'true';

  // Définir l'outil getProjects pour les questions (lecture seule)
  const getProjects = tool({
    description:
      "Récupère des informations sur les projets de l'utilisateur connecté. Utilise cet outil pour répondre aux QUESTIONS (combien de projets, quels projets, etc.). Ne modifie RIEN. " +
      "IMPORTANT : Si l'utilisateur mentionne un statut spécifique (annulés, terminés, en cours, ghost production, archive, rework), " +
      "tu DOIS utiliser le paramètre 'status' avec la valeur correspondante (ANNULE, TERMINE, EN_COURS, GHOST_PRODUCTION, ARCHIVE, A_REWORK). " +
      "Comprends les variations et fautes d'orthographe : 'ghos prod', 'ghost prod', 'ghost production' → GHOST_PRODUCTION, " +
      "'annulé' ou 'annulés' → ANNULE, 'terminé' ou 'fini' → TERMINE, etc.",
    // S'assurer que le nom de l'outil est bien 'getProjects'
    // Le SDK utilise automatiquement le nom de la variable si pas de paramètre 'name'
    parameters: z.object({
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
        .describe(
          'Filtrer par date de deadline spécifique (format ISO YYYY-MM-DD ou date relative)'
        ),
    }),
    execute: async ({ minProgress, maxProgress, status, hasDeadline, deadlineDate }) => {
      // Obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
      const targetUserId = await getTargetUserId(normalizedInput);

      // Détection intelligente des paramètres depuis la requête (fallback si l'IA ne les fournit pas)
      let finalStatus = status;
      let finalMinProgress = minProgress;
      let finalMaxProgress = maxProgress;
      let finalHasDeadline = hasDeadline;
      let finalDeadlineDate = deadlineDate;

      // Détecter le statut si non fourni (utilise la similarité de chaînes, pas d'IA intermédiaire)
      if (!finalStatus) {
        const detectedStatus = detectStatusFromQuery(normalizedInput);
        if (detectedStatus) {
          console.log(
            `[Assistant] Statut détecté automatiquement: ${detectedStatus} (non fourni par l'IA)`
          );
          finalStatus = detectedStatus as any;
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

      // Construire la clause WHERE
      const whereClause: any = {
        userId: targetUserId,
      };

      // Filtres de progression (utiliser les valeurs détectées)
      if (finalMinProgress !== undefined || finalMaxProgress !== undefined) {
        whereClause.progress = {};
        if (finalMinProgress !== undefined) {
          whereClause.progress.gte = finalMinProgress;
        }
        if (finalMaxProgress !== undefined) {
          whereClause.progress.lte = finalMaxProgress;
        }
      }

      // Filtre par statut (utiliser le statut détecté)
      if (finalStatus) {
        whereClause.status = finalStatus;
      }

      // Filtre par deadline (utiliser les valeurs détectées)
      if (finalHasDeadline !== undefined) {
        if (finalHasDeadline) {
          whereClause.deadline = { not: null };
        } else {
          whereClause.deadline = null;
        }
      }

      // Filtre par date de deadline (utiliser la date détectée)
      if (finalDeadlineDate) {
        const parsedDateStr = parseRelativeDate(finalDeadlineDate);
        if (parsedDateStr) {
          const targetDate = new Date(parsedDateStr);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          whereClause.deadline = {
            gte: targetDate,
            lt: nextDay,
          };
        }
      }

      // Mode test : retourner des données simulées
      if (isTestMode) {
        console.log('[TEST MODE] Simulation de lecture:', { where: whereClause });
        // Simuler des projets
        const simulatedCount = Math.floor(Math.random() * 5) + 1; // 1-5 projets
        const parsedDeadline = deadlineDate ? parseRelativeDate(deadlineDate) : null;
        return {
          count: simulatedCount,
          projects: Array.from({ length: simulatedCount }, (_, i) => ({
            id: `test-${i + 1}`,
            name: `Projet test ${i + 1}`,
            progress: minProgress !== undefined ? minProgress : Math.floor(Math.random() * 100),
            status: status || 'EN_COURS',
            deadline: parsedDeadline,
          })),
          message: `J'ai trouvé ${simulatedCount} projet(s) correspondant aux critères.`,
        };
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
        })),
        message: `J'ai trouvé ${projects.length} projet(s) correspondant aux critères.`,
      };
    },
  });

  // Définir l'outil updateProjects pour les modifications
  const updateProjects = tool({
    description:
      "Met à jour des projets selon des critères (progression, statut, deadline). Les projets sont automatiquement filtrés pour l'utilisateur connecté.",
    parameters: z.object({
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
    }),
    execute: async ({ minProgress, maxProgress, newDeadline, newStatus }) => {
      // Obtenir l'ID utilisateur cible (par nom ou utilisateur connecté)
      const targetUserId = await getTargetUserId(normalizedInput);

      // Construire la clause WHERE
      const whereClause: any = {
        userId: targetUserId,
      };

      // Construction dynamique des filtres de progression
      if (minProgress !== undefined || maxProgress !== undefined) {
        whereClause.progress = {};
        if (minProgress !== undefined) {
          whereClause.progress.gte = minProgress;
        }
        if (maxProgress !== undefined) {
          whereClause.progress.lte = maxProgress;
        }
      }

      // Construction de la mise à jour
      const data: any = {};

      // Traitement de la deadline avec conversion des dates relatives
      if (newDeadline) {
        const parsedDate = parseRelativeDate(newDeadline);
        if (parsedDate) {
          data.deadline = new Date(parsedDate);
        } else {
          // Essayer de parser directement
          const dateObj = new Date(newDeadline);
          if (!isNaN(dateObj.getTime())) {
            data.deadline = dateObj;
          } else {
            return {
              count: 0,
              message: `Erreur : Format de date invalide "${newDeadline}". Utilisez YYYY-MM-DD ou une date relative.`,
            };
          }
        }
      }

      if (newStatus) {
        data.status = newStatus;
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

  try {
    // Log des outils disponibles
    console.log('[Assistant] Démarrage avec outils:', {
      toolsAvailable: ['getProjects', 'updateProjects'],
      getProjectsType: typeof getProjects,
      updateProjectsType: typeof updateProjects,
      getProjectsKeys: getProjects ? Object.keys(getProjects) : [],
      updateProjectsKeys: updateProjects ? Object.keys(updateProjects) : [],
      originalInput: userInput.substring(0, 100),
      normalizedInput: normalizedInput.substring(0, 100),
      userId: currentUserId,
      userName: currentUserName,
      isAdmin,
    });

    // Vérifier que les outils sont bien des objets tool
    const toolsObject = {
      getProjects,
      updateProjects,
    };
    console.log('[Assistant] Objet tools passé au SDK:', {
      toolKeys: Object.keys(toolsObject),
      toolsStructure: JSON.stringify(toolsObject, null, 2).substring(0, 500),
    });

    const { text, toolResults } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `Tu es un assistant de gestion de projet. Nous sommes le ${today}.
               Tu dois aider à modifier les projets en masse pour l'utilisateur connecté.
               
               Statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
               
               ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT :
               
               1. DISTINCTION QUESTION vs COMMANDE :
                  - QUESTION (utilise getProjects OBLIGATOIREMENT) : "Combien", "Quels", "Liste", "Montre", "Quels projets", "Combien de projets"
                    ⚠️ CRITIQUE : Pour TOUTES les questions sur les projets, tu DOIS appeler getProjects, JAMAIS répondre directement sans outil.
                    Même si la question contient des fautes (ex: "combie, j'ai de gausteprauds?"), tu DOIS appeler getProjects avec les paramètres détectés.
                  - COMMANDE (utilise updateProjects) : "Déplace", "Marque", "Change", "Modifie", "Mets", "Met à jour"
                  
               1.1. PARAMÈTRES pour getProjects (utilise-les pour FILTRER les résultats) :
                  ✅ status (enum) : Filtrer par statut si l'utilisateur en mentionne un
                    Statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
                    
                    🧠 COMPRÉHENSION INTELLIGENTE DES STATUTS :
                    Tu dois comprendre les variations et fautes d'orthographe par toi-même :
                    - "ghost production", "ghost prod", "ghos prod", "goastprod", "gauspraud", "gausprod", "gaostprod", "gausteprauds" → GHOST_PRODUCTION
                    - "terminé", "terminés", "fini", "finis", "termine" → TERMINE
                    - "annulé", "annulés", "annul", "cancel" → ANNULE
                    - "en cours", "encours", "en cour" → EN_COURS
                    - "archive", "archivé", "archivés" → ARCHIVE
                    - "rework", "à rework", "a rework" → A_REWORK
                    
                    Utilise ta compréhension du langage naturel pour identifier le statut le plus proche, même avec des fautes importantes.
                    Exemple : "combie, j'ai de gausteprauds?" → Tu dois appeler getProjects({ status: "GHOST_PRODUCTION" })
                  ✅ minProgress (nombre 0-100) : Filtrer par progression minimum
                  ✅ maxProgress (nombre 0-100) : Filtrer par progression maximum
                  ✅ hasDeadline (boolean) : Filtrer les projets avec/sans deadline
                  ✅ deadlineDate (string ISO) : Filtrer par date de deadline
                  
               2. PARAMÈTRES EXACTS pour updateProjects (utilise EXACTEMENT ces noms, rien d'autre) :
                  ✅ minProgress (nombre 0-100) - pour filtrer par progression minimum
                  ✅ maxProgress (nombre 0-100) - pour filtrer par progression maximum
                  ✅ newDeadline (string ISO YYYY-MM-DD) - pour définir une nouvelle deadline
                  ✅ newStatus (enum) - pour changer le statut (EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE)
                  
                  ❌ N'UTILISE JAMAIS : nouvelleDeadline, deadline, progression, minProgression, maxProgression, statut, status, update, etc.
                  
               3. EXEMPLES CORRECTS :
                  - "Déplace deadline à demain pour projets à 80%" → updateProjects({ maxProgress: 80, newDeadline: "2024-12-12" })
                  - "Marque TERMINE les projets à 100%" → updateProjects({ minProgress: 100, maxProgress: 100, newStatus: "TERMINE" })
                  - "Combien de projets j'ai ?" → getProjects({})
                  - "Combien de projets goastprod j'ai ?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "j'ai cb de gauspraud?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "combie, j'ai de gausteprauds?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "Quels projets ghost production ?" → getProjects({ status: "GHOST_PRODUCTION" })
                  - "projets annulés" → getProjects({ status: "ANNULE" })
                  - "projets finis" → getProjects({ status: "TERMINE" })
                  
                  ⚠️ CRITIQUE : Dans TOUS ces exemples, tu DOIS appeler l'outil, JAMAIS répondre directement.
                  
               3.1. FORMAT D'APPEL DES OUTILS :
                  ⚠️ CRITIQUE : 
                  - Utilise UNIQUEMENT le format JSON pour les paramètres, JAMAIS de format XML ou autre
                  - Utilise UNIQUEMENT les paramètres définis dans le schéma : status, minProgress, maxProgress, hasDeadline, deadlineDate
                  - N'AJOUTE JAMAIS de paramètres qui n'existent pas (comme "tag", "label", etc.)
                  ✅ CORRECT : getProjects({ "status": "GHOST_PRODUCTION" })
                  ❌ INCORRECT : <function=getProjects>{"status": "GHOST_PRODUCTION"}</function>
                  ❌ INCORRECT : getProjects({ "status": "GHOST_PRODUCTION", "tag": "bg" }) // "tag" n'existe pas !
                  ❌ INCORRECT : getProjects(status="GHOST_PRODUCTION")
                  
               4. Pour les dates relatives, convertis-les en ISO YYYY-MM-DD :
                  - "demain" → date de demain
                  - "semaine prochaine" → date dans 7 jours
                  
               5. ⚠️ IMPORTANT : Pour TOUTES les questions sur les projets (combien, quels, liste, etc.), 
                  tu DOIS appeler getProjects, même si la question contient des fautes d'orthographe.
                  Ne réponds JAMAIS directement sans appeler l'outil pour les questions nécessitant des données de la base.
                  
                  Seule exception : si on te demande juste la liste des statuts disponibles, tu peux répondre directement : 
                  EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE.
               
               6. L'utilisateur connecté est "${currentUserName || 'utilisateur'}"${isAdmin ? ' (ADMIN)' : ''}. 
                  ${!isAdmin ? "⚠️ IMPORTANT : Vous ne pouvez accéder qu'à VOS PROPRES projets. Les mentions d'autres utilisateurs seront ignorées." : "En tant qu'ADMIN, vous pouvez accéder aux projets de tous les utilisateurs si un nom est mentionné."}
                  Si un nom d'utilisateur est mentionné dans la requête (ex: "pour Larian67"), 
                  ${isAdmin ? 'les projets seront filtrés pour cet utilisateur.' : 'cela sera ignoré et seuls vos projets seront utilisés.'}
                  Sinon, les projets de l'utilisateur connecté seront utilisés.`,
      prompt: normalizedInput,
      tools: {
        getProjects,
        updateProjects,
      },
    }).catch(async (error: any) => {
      // Log détaillé de l'erreur
      const errorDetails = {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        errorStack: error instanceof Error ? error.stack : undefined,
        userInput: userInput.substring(0, 200),
        toolsProvided: ['getProjects', 'updateProjects'],
        responseBody: error?.responseBody,
        failedGeneration: error?.responseBody?.error?.failed_generation,
      };

      console.error('[Assistant] Erreur lors de generateText:', errorDetails);

      // Si l'erreur est due à un format invalide ou des paramètres invalides de l'IA
      if (error?.responseBody?.error?.code === 'tool_use_failed') {
        const failedGeneration = error?.responseBody?.error?.failed_generation;
        console.warn(
          "[Assistant] L'IA a généré un format invalide ou des paramètres invalides, extraction et correction"
        );

        // Essayer d'extraire les paramètres valides depuis l'appel invalide
        let extractedParams: any = {};

        if (failedGeneration) {
          // Extraire le JSON depuis le format XML ou texte (gérer aussi les formats sans guillemets)
          const jsonMatch = failedGeneration.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              // Remplacer les clés sans guillemets par des clés avec guillemets pour JSON valide
              let jsonStr = jsonMatch[0]
                .replace(/(\w+):/g, '"$1":') // Ajouter guillemets aux clés
                .replace(/null/g, 'null') // Garder null tel quel
                .replace(/undefined/g, 'null'); // Remplacer undefined par null

              const parsed = JSON.parse(jsonStr);

              // Convertir les formats invalides en formats valides
              // "filters: {progression: {gte: 70, lt: 100}}" → minProgress: 70, maxProgress: 100
              if (parsed.filters && parsed.filters.progression) {
                const prog = parsed.filters.progression;
                if (prog.gte !== undefined && prog.gte !== null) {
                  extractedParams.minProgress = prog.gte;
                }
                if (prog.lte !== undefined && prog.lte !== null) {
                  extractedParams.maxProgress = prog.lte;
                }
                if (prog.lt !== undefined && prog.lt !== null) {
                  extractedParams.maxProgress = prog.lt;
                }
                if (prog.gt !== undefined && prog.gt !== null) {
                  extractedParams.minProgress = prog.gt;
                }
              }

              // Convertir les formats invalides en formats valides
              // "progression: {min: 70, max: null}" → maxProgress: 70
              // "progression: {op: '<', value: 70}" → maxProgress: 70
              // "progression: {inf: false, sup: 0.7}" → maxProgress: 70 (0.7 = 70%)
              if (parsed.progression) {
                // Format avec inf/sup (décimal) : {inf: false, sup: 0.7}
                if (parsed.progression.sup !== undefined && parsed.progression.sup !== null) {
                  // Convertir décimal en pourcentage (0.7 → 70)
                  const supValue =
                    typeof parsed.progression.sup === 'number'
                      ? parsed.progression.sup < 1
                        ? parsed.progression.sup * 100
                        : parsed.progression.sup
                      : parsed.progression.sup;
                  extractedParams.maxProgress = Math.round(supValue);
                }
                if (
                  parsed.progression.inf !== undefined &&
                  parsed.progression.inf !== null &&
                  parsed.progression.inf !== false
                ) {
                  // Convertir décimal en pourcentage
                  const infValue =
                    typeof parsed.progression.inf === 'number'
                      ? parsed.progression.inf < 1
                        ? parsed.progression.inf * 100
                        : parsed.progression.inf
                      : parsed.progression.inf;
                  extractedParams.minProgress = Math.round(infValue);
                }

                // Format avec opérateur : {op: '<', value: 70}
                if (parsed.progression.op && parsed.progression.value !== undefined) {
                  const op = parsed.progression.op;
                  const value = parsed.progression.value;

                  if (op === '<' || op === '&lt;') {
                    // "inférieur à" ou "<" → maxProgress
                    extractedParams.maxProgress = value;
                  } else if (op === '>' || op === '&gt;') {
                    // "supérieur à" ou ">" → minProgress
                    extractedParams.minProgress = value;
                  } else if (op === '=' || op === '==') {
                    // "égal à" → minProgress et maxProgress
                    extractedParams.minProgress = value;
                    extractedParams.maxProgress = value;
                  }
                }

                // Format avec min/max : {min: 70, max: null}
                if (parsed.progression.min !== undefined && parsed.progression.min !== null) {
                  extractedParams.minProgress = parsed.progression.min;
                }
                if (parsed.progression.max !== undefined && parsed.progression.max !== null) {
                  extractedParams.maxProgress = parsed.progression.max;
                }
              }

              // Filtrer uniquement les paramètres valides pour getProjects
              const validParams = [
                'status',
                'minProgress',
                'maxProgress',
                'hasDeadline',
                'deadlineDate',
              ];
              for (const key of validParams) {
                if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== '') {
                  extractedParams[key] = parsed[key];
                }
              }

              console.log(
                "[Assistant] Paramètres extraits depuis l'appel invalide:",
                extractedParams
              );
            } catch (e) {
              // Si le parsing JSON échoue, essayer d'extraire manuellement
              console.warn(
                '[Assistant] Impossible de parser JSON, extraction manuelle des paramètres'
              );

              // Extraire "progression: {min: 70}" ou "maxProgress: 70"
              const progressionMatch = failedGeneration.match(
                /progression[:\s]*\{[^}]*min[:\s]*(\d+)/i
              );
              if (progressionMatch) {
                extractedParams.minProgress = parseInt(progressionMatch[1], 10);
              }

              const maxProgMatch = failedGeneration.match(
                /progression[:\s]*\{[^}]*max[:\s]*(\d+)/i
              );
              if (maxProgMatch) {
                extractedParams.maxProgress = parseInt(maxProgMatch[1], 10);
              }

              // Pour "inférieur à 70%" ou "< à 70%", c'est maxProgress = 70
              const inferieurMatch = failedGeneration.match(/(?:inf[ée]rieur|<)[^\d]*(\d+)/i);
              if (inferieurMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(inferieurMatch[1], 10);
              }

              // Pour "supérieur à 70%" ou "> à 70%", c'est minProgress = 70
              const superieurMatch = failedGeneration.match(/(?:sup[ée]rieur|>)[^\d]*(\d+)/i);
              if (superieurMatch && !extractedParams.minProgress) {
                extractedParams.minProgress = parseInt(superieurMatch[1], 10);
              }

              // Extraire "filters: {progression: {gte: 70, lt: 100}}"
              const filtersGteMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*gte[:\s]*(\d+)/i
              );
              if (filtersGteMatch && !extractedParams.minProgress) {
                extractedParams.minProgress = parseInt(filtersGteMatch[1], 10);
              }

              const filtersLtMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*lt[:\s]*(\d+)/i
              );
              if (filtersLtMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(filtersLtMatch[1], 10);
              }

              const filtersLteMatch = failedGeneration.match(
                /filters[^}]*progression[^}]*lte[:\s]*(\d+)/i
              );
              if (filtersLteMatch && !extractedParams.maxProgress) {
                extractedParams.maxProgress = parseInt(filtersLteMatch[1], 10);
              }

              // Extraire "progression: {inf: false, sup: 0.7}" (format décimal)
              const supMatch = failedGeneration.match(/progression[^}]*sup[:\s]*([\d.]+)/i);
              if (supMatch && !extractedParams.maxProgress) {
                const supValue = parseFloat(supMatch[1]);
                // Convertir décimal en pourcentage (0.7 → 70)
                extractedParams.maxProgress = Math.round(supValue < 1 ? supValue * 100 : supValue);
              }

              const infMatch = failedGeneration.match(/progression[^}]*inf[:\s]*([\d.]+)/i);
              if (infMatch && !extractedParams.minProgress && infMatch[1] !== 'false') {
                const infValue = parseFloat(infMatch[1]);
                // Convertir décimal en pourcentage
                extractedParams.minProgress = Math.round(infValue < 1 ? infValue * 100 : infValue);
              }

              // Extraire directement "value: 70" si présent
              const valueMatch = failedGeneration.match(/["']?value["']?\s*:\s*(\d+)/i);
              if (valueMatch && failedGeneration.match(/["']?op["']?\s*:\s*["']?[<&]/i)) {
                // Si op est "<", c'est maxProgress
                if (!extractedParams.maxProgress) {
                  extractedParams.maxProgress = parseInt(valueMatch[1], 10);
                }
              } else if (valueMatch && failedGeneration.match(/["']?op["']?\s*:\s*["']?[>]/i)) {
                // Si op est ">", c'est minProgress
                if (!extractedParams.minProgress) {
                  extractedParams.minProgress = parseInt(valueMatch[1], 10);
                }
              }

              // Si on a "gte: 70, lt: 100" pour "< à 70%", c'est incorrect
              // On doit utiliser maxProgress: 70 (pas minProgress: 70)
              // Vérifier si la requête contient "inférieur" ou "<"
              if (
                extractedParams.minProgress &&
                !extractedParams.maxProgress &&
                (normalizedInput.includes('inférieur') || normalizedInput.includes('<'))
              ) {
                // C'est probablement une erreur - "inférieur à 70%" devrait être maxProgress: 70
                extractedParams.maxProgress = extractedParams.minProgress;
                delete extractedParams.minProgress;
              }
            }
          }
        }

        // Utiliser la détection automatique pour compléter les paramètres manquants
        // Ne pas utiliser le statut extrait si c'était une erreur (ex: A_REWORK détecté incorrectement)
        const detectedStatus = detectStatusFromQuery(normalizedInput);
        const detectedProgress = detectProgressFromQuery(normalizedInput);

        // Construire les paramètres finaux
        const finalParams: any = {
          ...extractedParams,
        };

        // Ne garder le statut extrait que s'il est valide et cohérent avec la requête
        // Si la requête ne mentionne pas de statut, ne pas utiliser un statut extrait par erreur
        if (detectedStatus && !finalParams.status) {
          finalParams.status = detectedStatus;
        } else if (extractedParams.status && !detectedStatus) {
          // Si on a extrait un statut mais qu'il n'est pas détecté dans la requête, le retirer
          // (probablement une erreur de l'IA)
          delete finalParams.status;
        }

        if (detectedProgress.minProgress !== undefined && finalParams.minProgress === undefined) {
          finalParams.minProgress = detectedProgress.minProgress;
        }
        if (detectedProgress.maxProgress !== undefined && finalParams.maxProgress === undefined) {
          finalParams.maxProgress = detectedProgress.maxProgress;
        }

        // Appeler directement getProjects avec les paramètres corrigés
        try {
          console.log('[Assistant] Appel direct avec paramètres corrigés:', finalParams);
          const result = await getProjects.execute(finalParams);
          return `J'ai trouvé ${result.count} projet(s) correspondant à votre recherche. ${result.message}`;
        } catch (executeError) {
          console.error("[Assistant] Erreur lors de l'exécution directe:", executeError);
        }
      }

      throw error;
    });

    // Log des résultats
    console.log('[Assistant] Résultats reçus:', {
      hasText: !!text,
      textLength: text?.length,
      hasToolResults: !!toolResults,
      toolResultsLength: toolResults?.length,
      toolResults: toolResults?.map((r: any) => ({
        toolName: r.toolName,
        toolCallId: r.toolCallId,
        hasResult: !!r.result,
        resultType: typeof r.result,
        resultKeys: r.result ? Object.keys(r.result) : [],
      })),
    });

    // Si l'IA n'a pas appelé d'outil mais a retourné du texte, c'est qu'elle a répondu directement
    // On retourne sa réponse telle quelle (elle devrait avoir compris la question)
    if ((!toolResults || toolResults.length === 0) && text) {
      console.log(
        "[Assistant] L'IA a répondu directement sans appeler d'outil, retour de sa réponse"
      );
      return text;
    }

    // Gestion du retour
    if (toolResults && toolResults.length > 0) {
      const firstResult = toolResults[0];

      console.log('[Assistant] Traitement du premier résultat:', {
        firstResultKeys: Object.keys(firstResult || {}),
        firstResult: JSON.stringify(firstResult, null, 2).substring(0, 500),
      });

      // Le SDK Vercel AI retourne les résultats différemment selon la version
      // Essayer différentes façons d'accéder au résultat
      let toolName = (firstResult as any).toolName;
      let result = (firstResult as any).result;

      console.log('[Assistant] Extraction initiale:', {
        toolName,
        hasResult: !!result,
        resultType: typeof result,
      });

      // Si pas de toolName, essayer de le déduire
      if (!toolName && (firstResult as any).toolCallId) {
        const toolCallId = (firstResult as any).toolCallId as string;
        console.log('[Assistant] Extraction depuis toolCallId:', { toolCallId });
        if (toolCallId.includes('getProjects')) toolName = 'getProjects';
        else if (toolCallId.includes('updateProjects')) toolName = 'updateProjects';
      }

      // Si pas de result direct, essayer d'autres propriétés
      if (!result) {
        result = (firstResult as any).output || (firstResult as any).value || firstResult;
        console.log('[Assistant] Résultat extrait depuis propriétés alternatives:', {
          hasResult: !!result,
          resultType: typeof result,
        });
      }

      // Vérifier que result existe et est un objet
      if (!result || typeof result !== 'object') {
        console.warn("[Assistant] Résultat d'outil invalide:", {
          toolName,
          result,
          resultType: typeof result,
          firstResult: JSON.stringify(firstResult, null, 2).substring(0, 500),
        });
        return text || "Erreur : Résultat d'outil invalide.";
      }

      console.log('[Assistant] Résultat validé:', {
        toolName,
        hasCount: 'count' in result,
        hasMessage: 'message' in result,
        hasProjects: 'projects' in result,
        projectsLength: (result as any).projects?.length,
      });

      const typedResult = result as {
        count?: number;
        message?: string;
        projects?: Array<{
          id: string;
          name: string;
          progress: number | null;
          status: string;
          deadline: string | null;
        }>;
      };

      // Si c'est getProjects (lecture), formater la réponse avec les données
      if (toolName === 'getProjects') {
        if (typedResult.count === 0 || !typedResult.projects || typedResult.projects.length === 0) {
          return typedResult.message || `Je n'ai trouvé aucun projet correspondant à vos critères.`;
        }

        // Formater une réponse détaillée avec les projets trouvés
        const count = typedResult.count ?? typedResult.projects.length;

        // Si c'est juste une question de comptage, retourner un message simple
        const firstResult = toolResults[0];
        const toolInput = (firstResult as any).input || {};
        const isSimpleCount =
          !toolInput.status &&
          !toolInput.minProgress &&
          !toolInput.maxProgress &&
          !toolInput.hasDeadline &&
          !toolInput.deadlineDate;

        if (isSimpleCount && count > 5) {
          // Pour les questions simples de comptage, retourner juste le nombre
          return typedResult.message || `Vous avez ${count} projet(s).`;
        }

        let response = typedResult.message || `J'ai trouvé ${count} projet(s) :\n\n`;

        // Limiter l'affichage à 10 projets max pour la lisibilité
        const projectsToShow = typedResult.projects.slice(0, 10);
        projectsToShow.forEach((project, index) => {
          response += `${index + 1}. ${project.name}`;
          if (project.progress !== null) {
            response += ` (${project.progress}%)`;
          }
          if (project.status) {
            response += ` - ${project.status}`;
          }
          if (project.deadline) {
            response += ` - Deadline: ${project.deadline}`;
          }
          response += '\n';
        });

        if (count > 10) {
          response += `\n... et ${count - 10} autre(s) projet(s).`;
        }

        return response;
      }

      // Si c'est updateProjects (modification), confirmer la mise à jour
      if (toolName === 'updateProjects') {
        revalidatePath('/projects'); // Rafraîchir la page des projets

        if (typedResult.message) {
          return typedResult.message;
        }

        if (typedResult.count !== undefined) {
          return `Succès ! J'ai mis à jour ${typedResult.count} projet(s).`;
        }

        // Fallback si aucune information disponible
        return 'Mise à jour effectuée.';
      }
    }

    return text; // Réponse conversationnelle si pas d'action
  } catch (error) {
    console.error('AI Error:', error);

    // Gestion d'erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('GROQ_API_KEY')) {
        return "Erreur : La clé API Groq n'est pas configurée. Veuillez ajouter GROQ_API_KEY dans votre fichier .env.local";
      }
      return `Désolé, une erreur est survenue : ${error.message}`;
    }

    return 'Désolé, une erreur est survenue lors du traitement.';
  }
}
