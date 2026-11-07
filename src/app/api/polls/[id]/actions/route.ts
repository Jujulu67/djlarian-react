import { NextRequest } from 'next/server';

import { createSuccessResponse } from '@/lib/api/responseHelpers';
import {
  pollActionSchema,
  pollErrorResponse,
  requirePollHost,
  validationError,
} from '@/lib/polls/api';
import { applyPollAction, getHostPollView } from '@/lib/polls/service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/polls/[id]/actions : pilotage du vote par l'animateur
 * (lancer, clore, prolonger, révéler, départager, tirer au sort). Renvoie la vue à jour.
 */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { host, error } = await requirePollHost();
    if (error) return error;
    const parsed = pollActionSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const { id } = await params;
    await applyPollAction(id, host.userId, host.isAdmin, parsed.data);
    return createSuccessResponse(await getHostPollView(id, host.userId, host.isAdmin));
  } catch (error) {
    return pollErrorResponse(error, 'POST /api/polls/[id]/actions');
  }
}
