import { NextRequest } from 'next/server';

import { createCreatedResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import {
  createPollSchema,
  pollErrorResponse,
  requirePollHost,
  validationError,
} from '@/lib/polls/api';
import { createPoll, listHostPolls } from '@/lib/polls/service';

/** GET /api/polls : votes de l'animateur connecté (30 derniers). */
export async function GET() {
  try {
    const { host, error } = await requirePollHost();
    if (error) return error;
    return createSuccessResponse(await listHostPolls(host.userId));
  } catch (error) {
    return pollErrorResponse(error, 'GET /api/polls');
  }
}

/** POST /api/polls : crée un vote (brouillon) avec ses participants. */
export async function POST(request: NextRequest) {
  try {
    const { host, error } = await requirePollHost();
    if (error) return error;
    const parsed = createPollSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    return createCreatedResponse(await createPoll(host.userId, parsed.data));
  } catch (error) {
    return pollErrorResponse(error, 'POST /api/polls');
  }
}
