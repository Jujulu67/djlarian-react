/**
 * @jest-environment node
 */
import prisma from '@/lib/prisma';

import { applyPollAction, castVote, getPublicPollView, PollError } from '../service';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    poll: { findUnique: jest.fn(), update: jest.fn((args) => args) },
    pollRound: { create: jest.fn((args) => args), update: jest.fn((args) => args) },
    pollVote: { upsert: jest.fn(), findUnique: jest.fn() },
    account: { count: jest.fn() },
    $transaction: jest.fn(async (ops) => ops),
  },
}));

const db = prisma as unknown as {
  poll: { findUnique: jest.Mock; update: jest.Mock };
  pollRound: { create: jest.Mock; update: jest.Mock };
  pollVote: { upsert: jest.Mock };
  account: { count: jest.Mock };
};

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 1_000);
const options = [
  { id: 'a', label: 'Alpha', position: 0 },
  { id: 'b', label: 'Beta', position: 1 },
  { id: 'c', label: 'Gamma', position: 2 },
];

function round(
  overrides: Partial<{
    endsAt: Date;
    votes: string[];
    candidates: string[];
    resultsRevealed: boolean;
    number: number;
  }> = {}
) {
  const { votes = [], candidates = ['a', 'b', 'c'], ...rest } = overrides;
  return {
    id: 'r1',
    number: 1,
    endsAt: future(),
    resultsRevealed: false,
    candidates: candidates.map((optionId) => ({ optionId })),
    votes: votes.map((optionId) => ({ optionId })),
    ...rest,
  };
}

function poll(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    code: 'ABCDEF',
    title: 'Concours',
    hostId: 'host',
    status: 'ACTIVE',
    requireOAuth: true,
    winnerOptionId: null,
    winnerByDraw: false,
    Host: { name: 'Hôte' },
    options,
    rounds: [round()],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('castVote', () => {
  it('enregistre la voix (ou la remplace) pendant la manche', async () => {
    db.poll.findUnique.mockResolvedValue(poll());
    db.account.count.mockResolvedValue(1);
    await castVote('ABCDEF', 'u1', 'b');
    expect(db.pollVote.upsert).toHaveBeenCalledWith({
      where: { roundId_userId: { roundId: 'r1', userId: 'u1' } },
      create: { roundId: 'r1', userId: 'u1', optionId: 'b' },
      update: { optionId: 'b' },
    });
  });

  it('refuse une fois le temps écoulé', async () => {
    db.poll.findUnique.mockResolvedValue(poll({ rounds: [round({ endsAt: past() })] }));
    await expect(castVote('ABCDEF', 'u1', 'b')).rejects.toMatchObject({ status: 409 });
    expect(db.pollVote.upsert).not.toHaveBeenCalled();
  });

  it("refuse un participant éliminé d'une manche de départage", async () => {
    db.poll.findUnique.mockResolvedValue(poll({ rounds: [round({ candidates: ['a', 'b'] })] }));
    await expect(castVote('ABCDEF', 'u1', 'c')).rejects.toMatchObject({ status: 400 });
  });

  it('exige un compte Twitch ou Google si le vote le demande', async () => {
    db.poll.findUnique.mockResolvedValue(poll());
    db.account.count.mockResolvedValue(0);
    await expect(castVote('ABCDEF', 'u1', 'a')).rejects.toMatchObject({ status: 403 });
  });

  it('accepte un compte email quand le vote est ouvert à tous', async () => {
    db.poll.findUnique.mockResolvedValue(poll({ requireOAuth: false }));
    await castVote('ABCDEF', 'u1', 'a');
    expect(db.account.count).not.toHaveBeenCalled();
    expect(db.pollVote.upsert).toHaveBeenCalled();
  });
});

describe('getPublicPollView', () => {
  it('cache les décomptes tant que la manche n’est pas révélée', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['a'] })] })
    );
    const view = await getPublicPollView('ABCDEF');
    expect(view.round).toMatchObject({
      isOpen: false,
      voterCount: 1,
      results: null,
      outcome: null,
    });
  });

  it('montre résultats et égalité une fois révélés', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['a', 'b'], resultsRevealed: true })] })
    );
    const view = await getPublicPollView('ABCDEF');
    expect(view.round?.outcome).toEqual({ kind: 'tie', tiedIds: ['a', 'b'] });
    expect(view.round?.results?.map((r) => r.votes)).toEqual([1, 1, 0]);
  });

  it('renvoie 404 pour un code inconnu', async () => {
    db.poll.findUnique.mockResolvedValue(null);
    await expect(getPublicPollView('ZZZZZZ')).rejects.toBeInstanceOf(PollError);
  });
});

describe('applyPollAction', () => {
  it('lance la première manche avec tous les participants', async () => {
    db.poll.findUnique.mockResolvedValue(poll({ status: 'DRAFT', rounds: [] }));
    await applyPollAction('p1', 'host', false, { action: 'start', durationSec: 60 });
    const data = db.pollRound.create.mock.calls[0][0].data;
    expect(data.number).toBe(1);
    expect(data.candidates.create).toEqual([
      { optionId: 'a' },
      { optionId: 'b' },
      { optionId: 'c' },
    ]);
    expect(db.poll.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'ACTIVE' },
    });
  });

  it("cache le vote d'un autre animateur (404), sauf pour un admin", async () => {
    db.poll.findUnique.mockResolvedValue(poll({ status: 'DRAFT', rounds: [] }));
    await expect(
      applyPollAction('p1', 'other', false, { action: 'start', durationSec: 60 })
    ).rejects.toMatchObject({ status: 404 });
    await applyPollAction('p1', 'admin', true, { action: 'start', durationSec: 60 });
    expect(db.pollRound.create).toHaveBeenCalled();
  });

  it('révéler un gagnant unique termine le vote', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['b', 'b', 'a'] })] })
    );
    await applyPollAction('p1', 'host', false, { action: 'reveal' });
    expect(db.poll.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'FINISHED', winnerOptionId: 'b' },
    });
  });

  it('révéler une égalité laisse le vote ouvert au départage', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['a', 'c'] })] })
    );
    await applyPollAction('p1', 'host', false, { action: 'reveal' });
    expect(db.pollRound.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { resultsRevealed: true },
    });
    expect(db.poll.update).not.toHaveBeenCalled();
  });

  it('le départage ouvre une manche limitée aux ex æquo', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['a', 'c', 'b', 'a', 'c'] })] })
    );
    await applyPollAction('p1', 'host', false, { action: 'tiebreak', durationSec: 30 });
    const data = db.pollRound.create.mock.calls[0][0].data;
    expect(data.number).toBe(2);
    expect(data.candidates.create).toEqual([{ optionId: 'a' }, { optionId: 'c' }]);
  });

  it('refuse un départage sans égalité, ou pendant la manche', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['a'] })] })
    );
    await expect(
      applyPollAction('p1', 'host', false, { action: 'tiebreak', durationSec: 30 })
    ).rejects.toMatchObject({ status: 409 });
    db.poll.findUnique.mockResolvedValue(poll());
    await expect(applyPollAction('p1', 'host', false, { action: 'draw' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('le tirage au sort choisit parmi les ex æquo', async () => {
    db.poll.findUnique.mockResolvedValue(
      poll({ rounds: [round({ endsAt: past(), votes: ['b', 'c'] })] })
    );
    await applyPollAction('p1', 'host', false, { action: 'draw' });
    const data = db.poll.update.mock.calls[0][0].data;
    expect(['b', 'c']).toContain(data.winnerOptionId);
    expect(data).toMatchObject({ status: 'FINISHED', winnerByDraw: true });
  });

  it('prolonge une manche ouverte', async () => {
    const r = round();
    db.poll.findUnique.mockResolvedValue(poll({ rounds: [r] }));
    await applyPollAction('p1', 'host', false, { action: 'extend', seconds: 30 });
    const { endsAt } = db.pollRound.update.mock.calls[0][0].data;
    expect(endsAt.getTime() - r.endsAt.getTime()).toBe(30_000);
  });

  it('ne touche plus à un vote terminé', async () => {
    db.poll.findUnique.mockResolvedValue(poll({ status: 'FINISHED' }));
    await expect(applyPollAction('p1', 'host', false, { action: 'close' })).rejects.toMatchObject({
      status: 409,
    });
  });
});
