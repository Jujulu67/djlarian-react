import { NextRequest } from 'next/server';

import { createErrorResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { pollErrorResponse } from '@/lib/polls/api';
import { normalizePollCode, POLL_CODE_PATTERN } from '@/lib/polls/rules';
import { getPublicPollView } from '@/lib/polls/service';

type Context = { params: Promise<{ code: string }> };

/**
 * GET /api/polls/public/[code] : état public du vote, interrogé toutes les 2 s par les
 * spectateurs et l'overlay. Identique pour tous : mis en cache 1 s par le CDN, si bien
 * que la base n'est sollicitée qu'une fois par seconde quel que soit le nombre de votants.
 */
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const code = normalizePollCode((await params).code);
    if (!POLL_CODE_PATTERN.test(code)) return createErrorResponse('Vote introuvable', 404);
    const response = createSuccessResponse(await getPublicPollView(code));
    response.headers.set('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=1');
    return response;
  } catch (error) {
    return pollErrorResponse(error, 'GET /api/polls/public/[code]');
  }
}
