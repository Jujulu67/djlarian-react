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

import {
  ASSISTANT_INPUT_TOO_LONG,
  isAssistantInputTooLong,
} from '@/lib/assistant/security/input-limits';
import { generateText } from 'ai';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { groq } from '@/lib/assistant/config';
import { createGetTargetUserId } from '@/lib/assistant/security/user-permissions';
import { createGetProjectsTool } from '@/lib/assistant/tools/get-projects-tool';
import { createUpdateProjectsTool } from '@/lib/assistant/tools/update-projects-tool';
import { createCreateProjectsTool } from '@/lib/assistant/tools/create-projects-tool';

import { classifyQuery } from '@/lib/assistant/query-parser/classifier';
import { debugLog, truncate } from '@/lib/assistant/utils/debug-logger';
import { detectFilters } from '@/lib/assistant/query-parser/filters';
import {
  updateConversationContext,
  detectContextReference,
  resolveContextReference,
} from '@/lib/assistant/conversational/conversation-memory';
import { extractUpdateData } from '@/lib/assistant/query-parser/updates';

import { SYSTEM_PROMPT_8B } from '@/lib/assistant/prompts/system-prompt-8b';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

const KNOWN_STYLES = ['Techno', 'House', 'DNB', 'Dubstep', 'Trance'] as const;
const VALID_STATUSES = [
  'EN_COURS',
  'TERMINE',
  'ANNULE',
  'A_REWORK',
  'GHOST_PRODUCTION',
  'ARCHIVE',
] as const;
const DEFAULT_LIST_FIELDS = ['progress', 'status', 'deadline'];

type Filters = ReturnType<typeof detectFilters>['filters'];
type Classification = ReturnType<typeof classifyQuery>;

interface QueryContext {
  currentUserId: string;
  normalizedInput: string;
  lowerQuery: string;
  filters: Filters;
}

interface AssistantTools {
  getProjects: ReturnType<typeof createGetProjectsTool>;
  updateProjects: ReturnType<typeof createUpdateProjectsTool>;
  createProjects: ReturnType<typeof createCreateProjectsTool>;
}

/** Demande de détails, même sans référence explicite au contexte. */
function isDetailsQuery(lowerQuery: string): boolean {
  return (
    /(?:avec|donne|donnes?|donner?|montre|montres?|montrer?|affiche|affiches?|afficher?)\s+(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)/i.test(
      lowerQuery
    ) ||
    /^(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)(?:\s+sur)?\s*$/i.test(
      lowerQuery.trim()
    )
  );
}

/**
 * Champs à afficher. Toujours re-détectés depuis la requête originale : le contexte ne doit pas
 * les influencer. À défaut, les champs par défaut + ceux filtrés.
 */
function fieldsToDisplay({ normalizedInput, lowerQuery, filters }: QueryContext): string[] {
  const { fieldsToShow } = detectFilters(normalizedInput, lowerQuery, [], []);
  if (fieldsToShow && fieldsToShow.length > 0) return fieldsToShow;
  return [
    ...DEFAULT_LIST_FIELDS,
    ...(filters.collab ? ['collab'] : []),
    ...(filters.style ? ['style'] : []),
    ...(filters.releaseDate ? ['releaseDate'] : []),
  ];
}

/** Réponse structurée que le client affiche en tableau. */
function listResponse(message: string, projects: unknown[], context: QueryContext): string {
  return JSON.stringify({
    message,
    data: { projects, type: 'list' as const, fieldsToShow: fieldsToDisplay(context) },
  });
}

async function runDirectList(
  getProjects: AssistantTools['getProjects'],
  context: QueryContext,
  classification: Classification
): Promise<string | null> {
  const params = { ...context.filters };
  try {
    if (!getProjects || typeof getProjects.execute !== 'function') return null;
    // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
    const result = await getProjects.execute(params, {});
    const typedResult = result as {
      count?: number;
      projects?: Array<{ id: string; name: string }>;
      message?: string;
    };
    if (!typedResult || typeof typedResult !== 'object' || !('count' in typedResult)) return null;

    const projects = typedResult.projects || [];
    updateConversationContext(context.currentUserId, {
      lastProjectIds: projects.map((p) => p.id),
      lastProjectNames: projects.map((p) => p.name || ''),
      lastProjectCount: typedResult.count,
      lastFilters: params,
      lastActionType: 'list',
      lastStatusFilter: params.status && typeof params.status === 'string' ? params.status : null,
    });

    if (typedResult.count === 0) {
      return typedResult.message || "Je n'ai trouvé aucun projet correspondant.";
    }
    if (classification.isCount && !classification.isList) {
      return typedResult.message || `Vous avez ${typedResult.count} projet(s).`;
    }
    const message = typedResult.message || `J'ai trouvé ${typedResult.count} projet(s).`;
    return listResponse(message, projects, context);
  } catch (error) {
    logger.error('[Assistant] Erreur exécution directe (List):', error);
    return null;
  }
}

async function runDirectUpdate(
  updateProjects: AssistantTools['updateProjects'],
  { currentUserId, normalizedInput, lowerQuery, filters }: QueryContext
): Promise<string | null> {
  const updateParams = extractUpdateData(normalizedInput, lowerQuery, filters, [...KNOWN_STYLES]);
  if (!updateParams) {
    logger.warn('[Assistant] Update détecté mais pas de paramètres extraits');
    return null;
  }

  const validUpdateParams = {
    ...filters,
    ...updateParams,
    newDeadline: updateParams.newDeadline || undefined,
  };
  try {
    if (!updateProjects || typeof updateProjects.execute !== 'function') return null;
    // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
    const result = await updateProjects.execute(validUpdateParams, {});
    const typedResult = result as { count?: number; message?: string };
    if (!typedResult || typeof typedResult !== 'object') return null;

    revalidatePath('/projects');
    if (typedResult.count !== undefined && typedResult.count > 0) {
      updateConversationContext(currentUserId, {
        lastActionType: 'update',
        lastActionTimestamp: Date.now(),
      });
    }
    return typedResult.message || `Mise à jour effectuée sur ${typedResult.count} projet(s).`;
  } catch (error) {
    logger.error('[Assistant] Erreur exécution directe (Update):', error);
    return null;
  }
}

/** Données de création extraites par le parseur, ou null sans nom de projet. */
async function parseCreateParams({ currentUserId, normalizedInput }: QueryContext) {
  const { parseQuery } = await import('@/lib/assistant/query-parser');
  // Collabs et styles déjà utilisés par l'utilisateur : le parseur les reconnaît ainsi
  const known = await prisma.project.findMany({
    where: { userId: currentUserId },
    select: { collab: true, style: true },
  });
  const distinct = (values: (string | null)[]) => [
    ...new Set(values.filter((v): v is string => Boolean(v))),
  ];
  const { createData } = parseQuery(
    normalizedInput,
    distinct(known.map((p) => p.collab)),
    distinct([...KNOWN_STYLES, ...known.map((p) => p.style)])
  );
  if (!createData?.name) return null;

  const style = KNOWN_STYLES.find((s) => s === createData.style);
  const status = VALID_STATUSES.find((s) => s === createData.status);
  return {
    name: createData.name,
    style,
    collab: createData.collab || undefined,
    status: status ?? 'EN_COURS',
    deadline: createData.deadline || undefined,
    label: undefined,
  };
}

async function runDirectCreate(
  createProjects: AssistantTools['createProjects'],
  context: QueryContext
): Promise<string | null> {
  const createParams = await parseCreateParams(context);
  if (!createParams) {
    logger.warn("[Assistant] Create détecté mais pas de nom extrait, passage à l'IA");
    return null;
  }

  try {
    if (!createProjects || typeof createProjects.execute !== 'function') return null;
    // @ts-expect-error - SDK AI v5 type inference issue with ToolCallOptions
    const result = await createProjects.execute(createParams, {});
    const typedResult = result as { project?: { id: string }; message?: string };
    if (!typedResult || typeof typedResult !== 'object') return null;

    revalidatePath('/projects');
    const createdProjectId = typedResult.project?.id;
    updateConversationContext(context.currentUserId, {
      lastActionType: 'create',
      lastActionTimestamp: Date.now(),
      lastProjectIds: createdProjectId ? [createdProjectId] : [],
    });

    const message = typedResult.message || `Projet "${createParams.name}" créé avec succès.`;
    // Le projet est encodé dans la réponse pour que le client puisse le récupérer
    return typedResult.project
      ? JSON.stringify({ message, createdProject: typedResult.project })
      : message;
  } catch (error) {
    // L'IA prend le relais
    logger.error('[Assistant] Erreur exécution directe (Create):', error);
    return null;
  }
}

/** Essaie liste, mise à jour puis création ; null pour laisser la main à l'IA. */
async function runDirectCommand(
  tools: AssistantTools,
  context: QueryContext,
  classification: Classification,
  isListing: boolean
): Promise<string | null> {
  const { isUpdate, isCreate } = classification;
  const listed = isListing ? await runDirectList(tools.getProjects, context, classification) : null;
  if (listed !== null) return listed;
  if (isUpdate) {
    return runDirectUpdate(tools.updateProjects, context);
  }
  return isCreate ? runDirectCreate(tools.createProjects, context) : null;
}

/** Réponse du modèle quand il a appelé un outil. */
function formatToolResponse(
  text: string | undefined,
  toolResult: { output?: unknown; result?: unknown; toolName?: string },
  context: QueryContext
): string {
  // Le SDK ai expose le retour de l'outil dans `output` (`result` dans les anciennes versions)
  const typedResult = (toolResult.output ?? toolResult.result) as
    | {
        message?: string;
        count?: number;
        project?: unknown;
        projects?: Array<{ id: string; name: string }>;
      }
    | undefined;
  const prefix = text ? `${text}\n\n` : '';
  if (!typedResult) return prefix;

  const countMessage =
    typedResult.count !== undefined ? `Action effectuée (${typedResult.count})` : '';
  const response = prefix + (typedResult.message || countMessage);

  if (toolResult.toolName === 'createProjects' && typedResult.project) {
    return JSON.stringify({ message: response, createdProject: typedResult.project });
  }
  if (toolResult.toolName === 'getProjects' && Array.isArray(typedResult.projects)) {
    return listResponse(response, typedResult.projects, context);
  }
  return response;
}

interface ModelRequest {
  context: QueryContext;
  classification: Classification;
  tools: AssistantTools;
  currentUserName: string | null;
  isAdmin: boolean;
  today: string;
  contextResolutionMessage?: string;
}

/** Fallback IA (Groq) : questions conversationnelles et commandes non résolues par le parseur. */
async function askModel({
  context,
  classification,
  tools,
  currentUserName,
  isAdmin,
  today,
  contextResolutionMessage,
}: ModelRequest): Promise<string> {
  const { normalizedInput } = context;
  const availableTools: Record<string, unknown> = classification.isConversationalQuestion
    ? {}
    : { ...tools };

  // Choix du modèle : 70B pour les requêtes complexes, 8B pour le reste (plus rapide/économique)
  const modelId = classification.isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

  try {
    const result = await generateText({
      model: groq(modelId),
      prompt: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}\n[SYSTEM INSTRUCTIONS END]\n\n⚠️ FORMAT DES OUTILS (CRITIQUE):
- Utilisez UNIQUEMENT le format JSON fourni par le système pour appeler les outils
- ❌ JAMAIS de format XML comme <function=createProjects>...</function>
- ✅ Utilisez directement l'outil avec les paramètres JSON fournis par le système

Date: ${today}\nUtilisateur: ${currentUserName || 'Inconnu'}\n${isAdmin ? 'Rôle: ADMIN' : ''}\n\n${contextResolutionMessage ? 'CONTEXTE: ' + contextResolutionMessage + '\n\n' : ''}User Query: ${normalizedInput}`,
      // @ts-expect-error - SDK AI v5 type inference issue with tool types
      tools: Object.keys(availableTools).length > 0 ? availableTools : undefined,
    }).catch(async (error: unknown) => {
      logger.error('[Assistant] Erreur lors de generateText:', error);
      throw error;
    });

    if (typeof result === 'string') {
      return result as string;
    }

    const { text, toolResults } = result;
    if (toolResults && toolResults.length > 0) {
      return formatToolResponse(text, toolResults[0], context);
    }
    return text || "Je n'ai pas compris.";
  } catch (error) {
    if (error instanceof Error) return `Erreur IA: ${error.message}`;
    return 'Erreur inconnue.';
  }
}

export async function processProjectCommand(userInput: string) {
  // Vérifier l'authentification
  const session = await auth();
  if (!session?.user?.id) {
    return "Erreur : Vous devez être connecté pour utiliser l'assistant.";
  }
  if (isAssistantInputTooLong(userInput)) {
    return `Erreur : ${ASSISTANT_INPUT_TOO_LONG}`;
  }

  const currentUserId = session.user.id;
  const currentUserName = session.user.name || null;
  const isAdmin = (session.user.role || 'USER') === 'ADMIN';
  const today = new Date().toISOString().split('T')[0];

  // Pas de normalisation par l'IA : elle modifie trop la requête, detectStatusFromQuery suffit
  const normalizedInput = userInput;
  const lowerQuery = normalizedInput.toLowerCase();

  const toolOptions = {
    getTargetUserId: createGetTargetUserId({ currentUserId, currentUserName, isAdmin }),
    normalizedInput,
    isTestMode: process.env.ASSISTANT_TEST_MODE === 'true',
  };
  const tools: AssistantTools = {
    getProjects: createGetProjectsTool(toolOptions),
    updateProjects: createUpdateProjectsTool(toolOptions),
    createProjects: createCreateProjectsTool(toolOptions),
  };

  let { filters } = detectFilters(normalizedInput, lowerQuery, [], []);

  // Mémoire conversationnelle : la requête fait-elle référence au contexte précédent ?
  const { hasContextReference } = detectContextReference(normalizedInput);
  const isDetailsRequest = isDetailsQuery(lowerQuery);
  let contextResolutionMessage: string | undefined;

  if (hasContextReference || isDetailsRequest) {
    const resolution = await resolveContextReference(currentUserId, normalizedInput);
    if (resolution.resolved) {
      filters = { ...resolution.filters, ...filters };
      contextResolutionMessage = resolution.message;
    } else if (resolution.message) {
      // Pas de contexte disponible : message explicatif
      return resolution.message;
    }
  }

  const classification = classifyQuery(normalizedInput, lowerQuery, filters);
  debugLog('assistant.ts:classification', 'Classification détectée', {
    userInput: truncate(normalizedInput),
    filters: Object.keys(filters),
    classification: {
      isList: classification.isList,
      isCount: classification.isCount,
      isUpdate: classification.isUpdate,
      isConversationalQuestion: classification.isConversationalQuestion,
      understood: classification.understood,
    },
  });

  const context: QueryContext = { currentUserId, normalizedInput, lowerQuery, filters };
  const isContextualListRequest =
    (hasContextReference || isDetailsRequest) && (classification.isList || isDetailsRequest);

  // Exécution directe (parser-first) : évite d'appeler Groq pour des commandes simples
  if (!classification.isConversationalQuestion || isContextualListRequest) {
    const isListing =
      classification.isList ||
      classification.isCount ||
      (hasContextReference && !classification.isUpdate) ||
      isContextualListRequest;
    const direct = await runDirectCommand(tools, context, classification, isListing);
    if (direct !== null) return direct;
  }

  return askModel({
    context,
    classification,
    tools,
    currentUserName,
    isAdmin,
    today,
    contextResolutionMessage,
  });
}
