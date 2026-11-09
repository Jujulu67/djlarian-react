import { NextRequest } from 'next/server';

import { createErrorResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { requireAuth } from '@/lib/api/requireAuth';
import { castVoteSchema, pollErrorResponse, validationError } from '@/lib/polls/api';
import { normalizePollCode, POLL_CODE_PATTERN } from '@/lib/polls/rules';
import { castVote, getMyVote } from '@/lib/polls/service';

type Context = { params: Promise<{ code: string }> };

async function readCode(params: Context['params']): Promise<string | null> {
  const code = normalizePollCode((await params).code);
  return POLL_CODE_PATTERN.test(code) ? code : null;
}

/** GET /api/polls/public/[code]/vote : voix de l'utilisateur dans la manche en cours. */
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { session, error } = await requireAuth({ requireUserId: true });
    if (error) return error;
    const code = await readCode(params);
    if (!code) return createErrorResponse('Vote introuvable', 404);
    return createSuccessResponse({ optionId: await getMyVote(code, session.user.id) });
  } catch (error) {
    return pollErrorResponse(error, 'GET /api/polls/public/[code]/vote');
  }
}

/** POST /api/polls/public/[code]/vote : vote ou change de vote tant que la manche est ouverte. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      message: 'Connecte-toi pour voter',
    });
    if (error) return error;
    const code = await readCode(params);
    if (!code) return createErrorResponse('Vote introuvable', 404);
    const parsed = castVoteSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    await castVote(code, session.user.id, parsed.data.optionId);
    return createSuccessResponse({ optionId: parsed.data.optionId });
  } catch (error) {
    return pollErrorResponse(error, 'POST /api/polls/public/[code]/vote');
  }
}
