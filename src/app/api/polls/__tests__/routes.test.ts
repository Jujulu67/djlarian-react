/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { applyPollAction, castVote, getPollHostAccess } from '@/lib/polls/service';

import { POST as postAction } from '../[id]/actions/route';
import { POST as postVote } from '../public/[code]/vote/route';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/polls/service', () => {
  const actual = jest.requireActual('@/lib/polls/service');
  return {
    PollError: actual.PollError,
    castVote: jest.fn(),
    applyPollAction: jest.fn(),
    getHostPollView: jest.fn().mockResolvedValue({ id: 'p1' }),
    getPollHostAccess: jest.fn(),
  };
});

const mockAuth = auth as jest.Mock;

function request(body: unknown) {
  return new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(body) });
}
const voteParams = (code: string) => ({ params: Promise.resolve({ code }) });
const pollParams = { params: Promise.resolve({ id: 'p1' }) };

beforeEach(() => jest.clearAllMocks());

describe('POST /api/polls/public/[code]/vote', () => {
  it('demande une connexion', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await postVote(request({ optionId: 'a' }), voteParams('ABCDEF'));
    expect(res.status).toBe(401);
    expect(castVote).not.toHaveBeenCalled();
  });

  it('rejette un code mal formé sans toucher à la base', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    const res = await postVote(request({ optionId: 'a' }), voteParams('../x'));
    expect(res.status).toBe(404);
    expect(castVote).not.toHaveBeenCalled();
  });

  it('vote avec le code normalisé', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    const res = await postVote(request({ optionId: 'a' }), voteParams('abcdef'));
    expect(res.status).toBe(200);
    expect(castVote).toHaveBeenCalledWith('ABCDEF', 'u1', 'a');
  });

  it("renvoie le message métier d'un refus", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    const { PollError } = jest.requireActual('@/lib/polls/service');
    (castVote as jest.Mock).mockRejectedValue(new PollError("Le vote n'est pas ouvert", 409));
    const res = await postVote(request({ optionId: 'a' }), voteParams('ABCDEF'));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Le vote n'est pas ouvert");
  });
});

describe('POST /api/polls/[id]/actions', () => {
  it('refuse un utilisateur sans le droit d’animer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    (getPollHostAccess as jest.Mock).mockResolvedValue({ canHost: false, isAdmin: false });
    const res = await postAction(request({ action: 'close' }), pollParams);
    expect(res.status).toBe(403);
    expect(applyPollAction).not.toHaveBeenCalled();
  });

  it('valide la durée demandée', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    (getPollHostAccess as jest.Mock).mockResolvedValue({ canHost: true, isAdmin: false });
    const res = await postAction(request({ action: 'start', durationSec: 99999 }), pollParams);
    expect(res.status).toBe(400);
    expect(applyPollAction).not.toHaveBeenCalled();
  });

  it("transmet l'action et renvoie la vue à jour", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    (getPollHostAccess as jest.Mock).mockResolvedValue({ canHost: true, isAdmin: false });
    const res = await postAction(request({ action: 'start', durationSec: 60 }), pollParams);
    expect(res.status).toBe(200);
    expect(applyPollAction).toHaveBeenCalledWith('p1', 'u1', false, {
      action: 'start',
      durationSec: 60,
    });
  });
});
