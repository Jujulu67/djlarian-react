import { NextRequest } from 'next/server';

import { createSuccessResponse } from '@/lib/api/responseHelpers';
import { pollErrorResponse, requirePollHost } from '@/lib/polls/api';
import { deletePoll, getHostPollView } from '@/lib/polls/service';

type Context = { params: Promise<{ id: string }> };

/** GET /api/polls/[id] : vue animateur, décomptes compris. */
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { host, error } = await requirePollHost();
    if (error) return error;
    const { id } = await params;
    const view = await getHostPollView(id, host.userId, host.isAdmin);
    return createSuccessResponse(view);
  } catch (error) {
    return pollErrorResponse(error, 'GET /api/polls/[id]');
  }
}

/** DELETE /api/polls/[id] */
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { host, error } = await requirePollHost();
    if (error) return error;
    const { id } = await params;
    await deletePoll(id, host.userId, host.isAdmin);
    return createSuccessResponse({ id });
  } catch (error) {
    return pollErrorResponse(error, 'DELETE /api/polls/[id]');
  }
}
