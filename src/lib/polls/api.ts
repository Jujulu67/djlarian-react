import { z } from 'zod';

import { handleApiError } from '@/lib/api/errorHandler';
import { createErrorResponse, createForbiddenResponse } from '@/lib/api/responseHelpers';
import { requireAuth } from '@/lib/api/requireAuth';

import { POLL_LIMITS } from './rules';
import { getPollHostAccess, PollError } from './service';

const duration = z.number().int().min(POLL_LIMITS.minDurationSec).max(POLL_LIMITS.maxDurationSec);

export const createPollSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(POLL_LIMITS.titleMaxLength),
  participants: z
    .array(z.string().trim().min(1).max(POLL_LIMITS.labelMaxLength))
    .min(POLL_LIMITS.minOptions, 'Il faut au moins 2 participants')
    .max(POLL_LIMITS.maxOptions, `${POLL_LIMITS.maxOptions} participants maximum`)
    .refine(
      (labels) => new Set(labels.map((l) => l.toLocaleLowerCase('fr'))).size === labels.length,
      'Chaque participant doit être unique'
    ),
  requireOAuth: z.boolean().default(true),
});

export const pollActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), durationSec: duration }),
  z.object({ action: z.literal('close') }),
  z.object({
    action: z.literal('extend'),
    seconds: z.number().int().min(5).max(POLL_LIMITS.maxExtendSec),
  }),
  z.object({ action: z.literal('reveal') }),
  z.object({ action: z.literal('tiebreak'), durationSec: duration }),
  z.object({ action: z.literal('draw') }),
]);

export const castVoteSchema = z.object({ optionId: z.string().min(1).max(64) });

/** Session d'un animateur autorisé, ou réponse d'erreur (401 anonyme, 403 sans le droit). */
export async function requirePollHost() {
  const { session, error } = await requireAuth({ requireUserId: true });
  if (error) return { host: null, error };
  const access = await getPollHostAccess(session.user.id);
  if (!access.canHost) {
    return {
      host: null,
      error: createForbiddenResponse("Tu n'as pas le droit d'animer des votes"),
    };
  }
  return { host: { userId: session.user.id, isAdmin: access.isAdmin }, error: null };
}

/** Erreurs métier en clair, le reste passe par le gestionnaire commun. */
export function pollErrorResponse(error: unknown, context: string) {
  if (error instanceof PollError) return createErrorResponse(error.message, error.status);
  return handleApiError(error, context);
}

export function validationError(error: z.ZodError) {
  return createErrorResponse(error.issues[0]?.message ?? 'Requête invalide', 400);
}
