/**
 * Script de test RÉEL de l'Assistant IA
 * Appelle vraiment l'API Groq et génère un rapport des réponses
 *
 * Usage: node test-assistant-real.mjs
 *        TEST_USER_ROLE=ADMIN node test-assistant-real.mjs  (pour tester en tant qu'admin)
 *
 * IMPORTANT: Ce script nécessite une session utilisateur valide.
 * Il mocke l'authentification pour permettre les tests.
 *
 * Variables d'environnement :
 * - TEST_USER_ID : ID de l'utilisateur de test (défaut: 'test-user-id')
 * - TEST_USER_NAME : Nom de l'utilisateur de test (défaut: 'Larian67')
 * - TEST_USER_ROLE : Rôle de l'utilisateur de test (défaut: 'USER', peut être 'ADMIN')
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger .env.local
config({ path: join(__dirname, '.env.local') });

// Activer le mode test pour empêcher les modifications réelles
process.env.ASSISTANT_TEST_MODE = 'true';

// Vérifier que la clé API est présente
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY non trouvée dans .env.local');
  process.exit(1);
}

// Cas de test à exécuter
const testCases = [
  {
    id: '1.1',
    category: 'Questions Simples',
    name: "Question d'information",
    input: "Bonjour, peux-tu me dire combien de projets j'ai ?",
    expectedBehavior: 'Réponse conversationnelle sans modification',
  },
  {
    id: '1.6',
    category: 'Questions Simples',
    name: 'Question avec nom utilisateur',
    input: 'Combien de projets a Larian67 ?',
    expectedBehavior: 'Réponse avec nombre de projets pour Larian67',
  },
  {
    id: '1.2',
    category: 'Questions Simples',
    name: 'Question sur les statuts',
    input: 'Quels sont les statuts disponibles pour les projets ?',
    expectedBehavior: 'Liste les statuts disponibles sans modification',
  },
  {
    id: '1.3',
    category: 'Questions Simples',
    name: 'Salutation simple',
    input: 'Bonjour',
    expectedBehavior: 'Réponse amicale et conversationnelle',
  },
  {
    id: '1.4',
    category: 'Questions Simples',
    name: 'Question avec date relative',
    input: 'Quels projets ont une deadline demain ?',
    expectedBehavior: 'Réponse informative sans modification',
  },
  {
    id: '1.5',
    category: 'Questions Simples',
    name: 'Question sur la progression',
    input: 'Combien de projets sont à plus de 50% de progression ?',
    expectedBehavior: 'Réponse avec nombre de projets sans modification',
  },
  {
    id: '2.1',
    category: 'Commandes de Modification - Deadlines',
    name: 'Déplacer deadline avec filtre de progression',
    input: 'Déplace la deadline à demain pour les projets finis à 80%',
    expectedBehavior: 'Modifie les deadlines des projets à 80%+',
    warning: '⚠️ Cette commande MODIFIERA réellement les données',
  },
  {
    id: '2.2',
    category: 'Commandes de Modification - Deadlines',
    name: 'Deadline avec date relative "semaine prochaine"',
    input: 'Déplace la deadline à la semaine prochaine pour tous les projets',
    expectedBehavior: 'Convertit "semaine prochaine" et modifie tous les projets',
    warning: '⚠️ Cette commande MODIFIERA réellement les données',
  },
  {
    id: '3.1',
    category: 'Commandes de Modification - Statuts',
    name: 'Marquer comme TERMINE',
    input: 'Marque comme TERMINE les projets à 100%',
    expectedBehavior: 'Change le statut en TERMINE pour les projets à 100%',
    warning: '⚠️ Cette commande MODIFIERA réellement les données',
  },
  {
    id: '3.2',
    category: 'Commandes de Modification - Statuts',
    name: 'Changer statut en EN_COURS',
    input: 'Change le statut en EN_COURS pour les projets à 50%',
    expectedBehavior: 'Change le statut en EN_COURS pour les projets à 50%',
    warning: '⚠️ Cette commande MODIFIERA réellement les données',
  },
];

// Mock de l'authentification pour les tests
// On va créer un utilisateur de test ou utiliser un ID existant
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';
const TEST_USER_NAME = 'Larian67'; // Nom d'utilisateur pour les tests
const TEST_USER_ROLE = process.env.TEST_USER_ROLE || 'USER'; // Rôle pour les tests (USER ou ADMIN)
const IS_ADMIN = TEST_USER_ROLE === 'ADMIN';

// Fonction pour appeler l'assistant avec mock d'auth
async function testAssistant(input) {
  try {
    // Importer directement depuis le fichier source (en mode test)
    // On va utiliser une approche différente : appeler directement la logique
    const { generateText } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');
    const { z } = await import('zod');
    const { tool } = await import('ai');

    // Configuration Groq
    const groq = createOpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });

    // Fonction utilitaire pour convertir les dates relatives
    function parseRelativeDate(dateStr) {
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
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      return null;
    }

    // Mode TEST activé via variable d'environnement ASSISTANT_TEST_MODE
    // Aucune modification réelle ne sera effectuée

    const userId = TEST_USER_ID;
    const userName = TEST_USER_NAME;
    const today = new Date().toISOString().split('T')[0];
    const isTestMode = process.env.ASSISTANT_TEST_MODE === 'true';

    // Fonction pour trouver un utilisateur par nom (mock pour les tests)
    async function findUserByName(userName) {
      if (!userName) return null;
      // En mode test, simuler la recherche
      if (userName === TEST_USER_NAME) {
        return { id: TEST_USER_ID, name: TEST_USER_NAME };
      }
      return null;
    }

    // Fonction pour extraire le nom d'utilisateur de la requête
    function extractUserNameFromQuery(query) {
      const patterns = [
        /(?:pour|de|à|avec|les projets de|a)\s+([A-Za-z0-9_]+)/i,
        /^([A-Za-z0-9_]+)\s+(?:a|à|possède)/i,
        /utilisateur\s+([A-Za-z0-9_]+)/i,
      ];

      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const extracted = match[1];
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

    // Fonction pour obtenir l'ID utilisateur cible (avec sécurité basée sur les droits)
    async function getTargetUserId(query) {
      if (query) {
        const extractedUserName = extractUserNameFromQuery(query);
        if (extractedUserName) {
          // Vérifier si l'utilisateur connecté est ADMIN
          if (!IS_ADMIN) {
            // Si l'utilisateur n'est pas admin, vérifier si le nom mentionné correspond à l'utilisateur connecté
            if (extractedUserName.toLowerCase() !== userName?.toLowerCase()) {
              // L'utilisateur essaie d'accéder aux projets d'un autre utilisateur sans être admin
              // Forcer l'utilisation de son propre ID
              console.log(
                `   [SÉCURITÉ] Utilisateur non-admin (${userName}) a tenté d'accéder aux projets de ${extractedUserName}. Accès refusé.`
              );
              return userId; // Forcer l'utilisation de l'utilisateur connecté
            }
          }

          // Si admin OU si le nom correspond à l'utilisateur connecté, chercher l'utilisateur
          const targetUser = await findUserByName(extractedUserName);
          if (targetUser) {
            // Double vérification : si pas admin, s'assurer que c'est bien l'utilisateur connecté
            if (!IS_ADMIN && targetUser.id !== userId) {
              console.log(
                `   [SÉCURITÉ] Tentative d'accès non autorisée aux projets de ${extractedUserName}.`
              );
              return userId;
            }
            return targetUser.id;
          }
        }
      }

      // Par défaut, utiliser l'utilisateur connecté
      return userId;
    }

    // Définir l'outil getProjects pour les questions (lecture seule)
    const getProjects = tool({
      description:
        "Récupère des informations sur les projets de l'utilisateur connecté. Utilise cet outil pour répondre aux QUESTIONS (combien de projets, quels projets, etc.). Ne modifie RIEN.",
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
          .describe('Filtrer par statut'),
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
        // Obtenir l'ID utilisateur cible
        const targetUserId = await getTargetUserId(input);
        const whereClause = { userId: targetUserId };

        if (minProgress !== undefined || maxProgress !== undefined) {
          whereClause.progress = {};
          if (minProgress !== undefined) whereClause.progress.gte = minProgress;
          if (maxProgress !== undefined) whereClause.progress.lte = maxProgress;
        }

        if (status) whereClause.status = status;

        if (hasDeadline !== undefined) {
          whereClause.deadline = hasDeadline ? { not: null } : null;
        }

        if (deadlineDate) {
          const parsedDateStr = parseRelativeDate(deadlineDate);
          if (parsedDateStr) {
            const targetDate = new Date(parsedDateStr);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            whereClause.deadline = { gte: targetDate, lt: nextDay };
          }
        }

        // Mode test : données simulées
        if (isTestMode) {
          console.log('   [TEST MODE] Simulation de lecture:', { where: whereClause });
          const simulatedCount = Math.floor(Math.random() * 5) + 1;
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

        // En production, on utiliserait vraiment Prisma
        return { count: 0, projects: [], message: 'Aucun projet trouvé.' };
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
        // Obtenir l'ID utilisateur cible
        const targetUserId = await getTargetUserId(input);
        const whereClause = { userId: targetUserId };
        if (minProgress !== undefined || maxProgress !== undefined) {
          whereClause.progress = {};
          if (minProgress !== undefined) whereClause.progress.gte = minProgress;
          if (maxProgress !== undefined) whereClause.progress.lte = maxProgress;
        }

        const data = {};
        if (newDeadline) {
          const parsedDate = parseRelativeDate(newDeadline);
          if (parsedDate) {
            data.deadline = new Date(parsedDate);
          } else {
            const dateObj = new Date(newDeadline);
            if (!isNaN(dateObj.getTime())) {
              data.deadline = dateObj;
            } else {
              return { count: 0, message: `Erreur : Format de date invalide "${newDeadline}".` };
            }
          }
        }
        if (newStatus) {
          data.status = newStatus;
        }

        if (Object.keys(data).length === 0) {
          return { count: 0, message: 'Rien à mettre à jour. Aucune modification spécifiée.' };
        }

        // MODE TEST : Ne jamais modifier la base de données
        if (isTestMode) {
          console.log('   [TEST MODE] Simulation de mise à jour:', {
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

        // En production, on utiliserait vraiment Prisma
        // const result = await prisma.project.updateMany({ where: whereClause, data });
        // return { count: result.count, message: ... };
      },
    });

    const startTime = Date.now();
    let toolCalled = false;
    let finalResponse = '';

    try {
      const { text, toolResults } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system: `Tu es un assistant de gestion de projet. Nous sommes le ${today}.
                 Tu dois aider à modifier les projets en masse pour l'utilisateur connecté.
                 
                 Statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
                 
                 ⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT :
                 
                 1. DISTINCTION QUESTION vs COMMANDE :
                    - QUESTION (utilise getProjects) : "Combien", "Quels", "Liste", "Montre", "Quels projets", "Combien de projets"
                    - COMMANDE (utilise updateProjects) : "Déplace", "Marque", "Change", "Modifie", "Mets", "Met à jour"
                    
                 2. PARAMÈTRES EXACTS pour updateProjects (utilise EXACTEMENT ces noms, rien d'autre) :
                    ✅ minProgress (nombre 0-100) - pour filtrer par progression minimum
                    ✅ maxProgress (nombre 0-100) - pour filtrer par progression maximum
                    ✅ newDeadline (string ISO YYYY-MM-DD) - pour définir une nouvelle deadline
                    ✅ newStatus (enum) - pour changer le statut (EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE)
                    
                    ❌ N'UTILISE JAMAIS : nouvelleDeadline, deadline, new_deadline, progression, minProgression, maxProgression, statut, status, update, etc.
                    
                 3. EXEMPLES CORRECTS :
                    - "Déplace deadline à demain pour projets à 80%" → updateProjects({ maxProgress: 80, newDeadline: "2024-12-12" })
                    - "Marque TERMINE les projets à 100%" → updateProjects({ minProgress: 100, maxProgress: 100, newStatus: "TERMINE" })
                    - "Combien de projets j'ai ?" → getProjects({})
                    
                 4. Pour les dates relatives, convertis-les en ISO YYYY-MM-DD :
                    - "demain" → date de demain
                    - "semaine prochaine" → date dans 7 jours
                    
                 5. Pour les questions sur les statuts disponibles, réponds directement sans outil : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE.
                 
                 6. L'utilisateur connecté est "${userName}"${IS_ADMIN ? ' (ADMIN)' : ''}. 
                    ${!IS_ADMIN ? "⚠️ IMPORTANT : Vous ne pouvez accéder qu'à VOS PROPRES projets. Les mentions d'autres utilisateurs seront ignorées." : "En tant qu'ADMIN, vous pouvez accéder aux projets de tous les utilisateurs si un nom est mentionné."}
                    Si un nom d'utilisateur est mentionné dans la requête (ex: "pour Larian67"), 
                    ${IS_ADMIN ? 'les projets seront filtrés pour cet utilisateur.' : 'cela sera ignoré et seuls vos projets seront utilisés.'}
                    Sinon, les projets de l'utilisateur connecté seront utilisés.`,
        prompt: input,
        tools: { getProjects, updateProjects },
      });

      const duration = Date.now() - startTime;

      // Traiter les résultats
      toolCalled = toolResults && toolResults.length > 0;

      if (toolCalled) {
        // Si un outil a été appelé, utiliser son résultat
        const firstResult = toolResults[0];

        // Le SDK Vercel AI retourne les résultats différemment selon la version
        // Essayer différentes façons d'accéder au résultat
        let toolName = firstResult?.toolName;
        let toolResult = firstResult?.result;

        // Si pas de toolName, essayer de le déduire
        if (!toolName && firstResult?.toolCallId) {
          if (firstResult.toolCallId.includes('getProjects')) toolName = 'getProjects';
          else if (firstResult.toolCallId.includes('updateProjects')) toolName = 'updateProjects';
        }

        // Si pas de result direct, essayer d'autres propriétés
        if (!toolResult) {
          toolResult = firstResult?.output || firstResult?.value || firstResult;
        }

        // Debug: afficher ce qu'on reçoit (seulement si DEBUG est activé)
        if (process.env.DEBUG === '1') {
          console.log('   [DEBUG] Tool result structure:', {
            toolName,
            hasResult: !!toolResult,
            resultType: typeof toolResult,
            firstResultKeys: Object.keys(firstResult || {}),
            firstResult: JSON.stringify(firstResult, null, 2).substring(0, 500),
          });
        }

        // Si c'est getProjects (lecture), formater la réponse avec les données
        if ((toolName === 'getProjects' || toolName?.includes('getProjects')) && toolResult) {
          if (toolResult.projects && Array.isArray(toolResult.projects)) {
            if (toolResult.count === 0 || toolResult.projects.length === 0) {
              finalResponse = `Je n'ai trouvé aucun projet correspondant à vos critères.`;
            } else {
              let response =
                toolResult.message ||
                `J'ai trouvé ${toolResult.count || toolResult.projects.length} projet(s) :\n\n`;
              const projectsToShow = toolResult.projects.slice(0, 10);
              projectsToShow.forEach((project, index) => {
                response += `${index + 1}. ${project.name || `Projet ${index + 1}`}`;
                if (project.progress !== null && project.progress !== undefined) {
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
              if ((toolResult.count || toolResult.projects.length) > 10) {
                response += `\n... et ${(toolResult.count || toolResult.projects.length) - 10} autre(s) projet(s).`;
              }
              finalResponse = response;
            }
          } else if (toolResult.message) {
            finalResponse = toolResult.message;
          } else if (toolResult.count !== undefined) {
            finalResponse = `J'ai trouvé ${toolResult.count} projet(s).`;
          } else {
            finalResponse = JSON.stringify(toolResult, null, 2);
          }
        } else if (toolResult) {
          // Pour updateProjects ou autres outils
          if (typeof toolResult === 'string') {
            finalResponse = toolResult;
          } else if (toolResult.message) {
            finalResponse = toolResult.message;
          } else if (toolResult.count !== undefined) {
            finalResponse = `Succès ! J'ai mis à jour ${toolResult.count} projet(s).`;
          } else {
            finalResponse = JSON.stringify(toolResult, null, 2);
          }
        } else {
          finalResponse = text || 'Outil appelé mais résultat non disponible';
        }
      } else {
        // Pas d'outil appelé, utiliser le texte de réponse
        finalResponse = text || 'Aucune réponse générée';
      }

      return {
        success: true,
        response: finalResponse,
        duration,
        error: null,
        toolCalled,
        rawText: text,
        rawToolResults: toolResults,
      };
    } catch (error) {
      return {
        success: false,
        response: null,
        duration: Date.now() - startTime,
        error: error.message || String(error),
        toolCalled: false,
      };
    }
  } catch (error) {
    return {
      success: false,
      response: null,
      duration: null,
      error: error.message || String(error),
      toolCalled: false,
    };
  }
}

// Fonction pour analyser la cohérence d'une réponse
function analyzeResponse(testCase, result) {
  const analysis = {
    isValid: true,
    issues: [],
    warnings: [],
    checks: {},
  };

  if (!result.success) {
    analysis.isValid = false;
    analysis.issues.push(`Erreur lors de l'appel: ${result.error}`);
    return analysis;
  }

  const response = result.response || '';

  if (!response || response.trim().length === 0) {
    analysis.isValid = false;
    analysis.issues.push('La réponse est vide');
  } else {
    analysis.checks.hasResponse = true;
    analysis.checks.responseLength = response.length;
  }

  const frenchWords = [
    'projet',
    'projets',
    'deadline',
    'statut',
    'progression',
    'modifié',
    'mis à jour',
  ];
  const hasFrench = frenchWords.some((word) => response.toLowerCase().includes(word));
  analysis.checks.isInFrench = hasFrench;

  if (response.toLowerCase().includes('erreur') && !testCase.expectedBehavior.includes('erreur')) {
    analysis.warnings.push('La réponse contient le mot "erreur"');
  }

  if (testCase.category.includes('Questions Simples')) {
    if (
      response.toLowerCase().includes('modifié') ||
      response.toLowerCase().includes('mis à jour')
    ) {
      analysis.warnings.push('Question simple mais réponse mentionne une modification');
    }
    if (result.toolCalled) {
      analysis.warnings.push('Question simple mais outil de modification appelé');
    }
  }

  if (testCase.category.includes('Modification')) {
    if (!response.toLowerCase().includes('projet')) {
      analysis.warnings.push('Commande de modification mais pas de mention de "projet"');
    }
  }

  if (result.duration) {
    analysis.checks.responseTime = result.duration;
    if (result.duration > 10000) {
      analysis.warnings.push(`Réponse lente: ${result.duration}ms`);
    }
  }

  return analysis;
}

// Fonction pour formater le rapport en Markdown
function formatReportAsMarkdown(report) {
  let md = `# Rapport de Test - Assistant IA\n\n`;
  md += `**Date:** ${new Date(report.metadata.timestamp).toLocaleString('fr-FR')}\n\n`;
  md += `**Résumé:**\n`;
  md += `- Total de tests: ${report.metadata.totalTests}\n`;
  md += `- Tests réussis: ${report.metadata.successfulTests}\n`;
  md += `- Tests échoués: ${report.metadata.failedTests}\n\n`;
  md += `---\n\n`;

  const byCategory = {};
  report.results.forEach((result) => {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  });

  Object.keys(byCategory).forEach((category) => {
    md += `## ${category}\n\n`;

    byCategory[category].forEach((result) => {
      md += `### Test ${result.id}: ${result.name}\n\n`;
      md += `**Input:**\n\`\`\`\n${result.input}\n\`\`\`\n\n`;
      md += `**Comportement attendu:** ${result.expectedBehavior}\n\n`;

      if (result.success) {
        md += `**✅ Réponse reçue:**\n\n`;
        md += `\`\`\`\n${result.response}\n\`\`\`\n\n`;
        md += `**Durée:** ${result.duration}ms\n`;
        if (result.toolCalled !== undefined) {
          md += `**Outil appelé:** ${result.toolCalled ? 'Oui' : 'Non'}\n`;
        }
        md += `\n`;

        if (result.analysis.issues.length > 0) {
          md += `**❌ Problèmes détectés:**\n`;
          result.analysis.issues.forEach((issue) => {
            md += `- ${issue}\n`;
          });
          md += `\n`;
        }

        if (result.analysis.warnings.length > 0) {
          md += `**⚠️ Avertissements:**\n`;
          result.analysis.warnings.forEach((warning) => {
            md += `- ${warning}\n`;
          });
          md += `\n`;
        }

        md += `**Vérifications:**\n`;
        md += `- Réponse présente: ${result.analysis.checks.hasResponse ? '✅' : '❌'}\n`;
        if (result.analysis.checks.responseLength) {
          md += `- Longueur: ${result.analysis.checks.responseLength} caractères\n`;
        }
        md += `- En français: ${result.analysis.checks.isInFrench ? '✅' : '⚠️'}\n`;
        if (result.analysis.checks.responseTime) {
          md += `- Temps de réponse: ${result.analysis.checks.responseTime}ms\n`;
        }
        md += `\n`;
      } else {
        md += `**❌ Erreur:**\n\n`;
        md += `\`\`\`\n${result.error}\n\`\`\`\n\n`;
      }

      md += `---\n\n`;
    });
  });

  const allIssues = report.results.flatMap((r) => r.analysis.issues);
  const allWarnings = report.results.flatMap((r) => r.analysis.warnings);

  if (allIssues.length > 0 || allWarnings.length > 0) {
    md += `## Analyse Globale\n\n`;

    if (allIssues.length > 0) {
      md += `### Problèmes Critiques\n\n`;
      allIssues.forEach((issue, index) => {
        md += `${index + 1}. ${issue}\n`;
      });
      md += `\n`;
    }

    if (allWarnings.length > 0) {
      md += `### Avertissements\n\n`;
      allWarnings.forEach((warning, index) => {
        md += `${index + 1}. ${warning}\n`;
      });
      md += `\n`;
    }
  }

  const avgDuration =
    report.results.filter((r) => r.duration).reduce((sum, r) => sum + r.duration, 0) /
    report.results.filter((r) => r.duration).length;

  if (avgDuration) {
    md += `### Statistiques\n\n`;
    md += `- Temps de réponse moyen: ${Math.round(avgDuration)}ms\n`;
    md += `- Taux de succès: ${Math.round((report.metadata.successfulTests / report.metadata.totalTests) * 100)}%\n\n`;
  }

  return md;
}

// Fonction principale
async function runTests() {
  console.log("🧪 Démarrage des tests RÉELS de l'Assistant IA\n");
  console.log('='.repeat(60));
  console.log(`📋 ${testCases.length} cas de test à exécuter\n`);
  console.log('⚠️  NOTE: Les modifications en base sont MOCKÉES (pas de vraies modifications)\n');

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Test ${testCase.id}: ${testCase.name}`);
    if (testCase.warning) {
      console.log(`   ${testCase.warning}`);
    }
    console.log(`   Input: "${testCase.input}"`);

    try {
      const result = await testAssistant(testCase.input);
      const analysis = analyzeResponse(testCase, result);

      results.push({ testCase, result, analysis });

      if (result.success) {
        console.log(`   ✅ Réponse reçue (${result.duration}ms)`);
        if (result.toolCalled) {
          console.log(`   🔧 Outil de modification appelé`);
        }
        if (analysis.issues.length > 0) {
          console.log(`   ⚠️  Problèmes: ${analysis.issues.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.push({
        testCase,
        result: {
          success: false,
          response: null,
          duration: null,
          error: error.message,
          toolCalled: false,
        },
        analysis: {
          isValid: false,
          issues: [error.message],
          warnings: [],
          checks: {},
        },
      });
    }

    console.log('');

    // Pause entre les tests
    if (i < testCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Générer le rapport
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTests: testCases.length,
      successfulTests: results.filter((r) => r.result.success).length,
      failedTests: results.filter((r) => !r.result.success).length,
    },
    results: results.map(({ testCase, result, analysis }) => ({
      id: testCase.id,
      category: testCase.category,
      name: testCase.name,
      input: testCase.input,
      expectedBehavior: testCase.expectedBehavior,
      response: result.response,
      success: result.success,
      error: result.error,
      duration: result.duration,
      toolCalled: result.toolCalled,
      analysis: {
        isValid: analysis.isValid,
        issues: analysis.issues,
        warnings: analysis.warnings,
        checks: analysis.checks,
      },
    })),
  };

  // Sauvegarder en JSON
  const jsonPath = join(__dirname, 'assistant-test-report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Rapport JSON sauvegardé: ${jsonPath}`);

  // Sauvegarder en Markdown
  const mdPath = join(__dirname, 'assistant-test-report.md');
  const mdReport = formatReportAsMarkdown(report);
  writeFileSync(mdPath, mdReport, 'utf-8');
  console.log(`📄 Rapport Markdown sauvegardé: ${mdPath}`);

  console.log('\n✅ Tests terminés !');
  console.log(`\n📊 Résumé:`);
  console.log(
    `   - Tests réussis: ${report.metadata.successfulTests}/${report.metadata.totalTests}`
  );
  console.log(`   - Tests échoués: ${report.metadata.failedTests}/${report.metadata.totalTests}`);
}

// Exécuter les tests
runTests().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
