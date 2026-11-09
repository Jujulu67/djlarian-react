import { randomInt } from 'node:crypto';

import prisma from '@/lib/prisma';

import {
  generatePollCode,
  getRoundOutcome,
  isRoundOpen,
  POLL_STATUS,
  type RoundOutcome,
  tallyVotes,
} from './rules';
import type { HostPollSummary, HostPollView, PollRoundView, PollView } from './types';

/** Erreur métier : le message est affiché tel quel à l'utilisateur. */
export class PollError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400
  ) {
    super(message);
    this.name = 'PollError';
  }
}

const pollInclude = {
  Host: { select: { name: true } },
  options: { orderBy: { position: 'asc' as const } },
  rounds: {
    orderBy: { number: 'desc' as const },
    take: 1,
    include: { candidates: true, votes: { select: { optionId: true } } },
  },
};

type LoadedPoll = NonNullable<Awaited<ReturnType<typeof findPoll>>>;
type LoadedRound = LoadedPoll['rounds'][number];

function findPoll(where: { id: string } | { code: string }) {
  return prisma.poll.findUnique({ where, include: pollInclude });
}

function candidateIdsInOrder(poll: LoadedPoll, round: LoadedRound): string[] {
  const inRound = new Set(round.candidates.map((c) => c.optionId));
  return poll.options.filter((o) => inRound.has(o.id)).map((o) => o.id);
}

function roundOutcome(poll: LoadedPoll, round: LoadedRound): RoundOutcome {
  return getRoundOutcome(tallyVotes(candidateIdsInOrder(poll, round), round.votes));
}

/**
 * Vue d'un sondage. `withResults` force les décomptes (animateur) ; sinon ils n'apparaissent
 * qu'une fois la manche révélée, pour que le public ne voie rien pendant le vote.
 */
function toView(poll: LoadedPoll, withResults: boolean, now = new Date()): PollView {
  const labels = new Map(poll.options.map((o) => [o.id, o.label]));
  const round = poll.rounds[0];
  let roundView: PollRoundView | null = null;

  if (round) {
    const ids = candidateIdsInOrder(poll, round);
    const isOpen = isRoundOpen(round, now);
    const showResults = withResults || round.resultsRevealed;
    const tally = tallyVotes(ids, round.votes);
    roundView = {
      number: round.number,
      endsAt: round.endsAt.toISOString(),
      isOpen,
      resultsRevealed: round.resultsRevealed,
      voterCount: round.votes.length,
      candidates: ids.map((id) => ({ id, label: labels.get(id) ?? '' })),
      results: showResults
        ? tally.map((t) => ({
            optionId: t.optionId,
            label: labels.get(t.optionId) ?? '',
            votes: t.votes,
          }))
        : null,
      outcome: showResults && !isOpen ? getRoundOutcome(tally) : null,
    };
  }

  const winnerLabel = poll.winnerOptionId ? labels.get(poll.winnerOptionId) : undefined;
  return {
    code: poll.code,
    title: poll.title,
    status: poll.status as PollView['status'],
    hostName: poll.Host.name ?? 'Animateur',
    requireOAuth: poll.requireOAuth,
    round: roundView,
    winner: winnerLabel ? { label: winnerLabel, byDraw: poll.winnerByDraw } : null,
    serverNow: now.toISOString(),
  };
}

export async function getPublicPollView(code: string): Promise<PollView> {
  const poll = await findPoll({ code });
  if (!poll) throw new PollError('Vote introuvable', 404);
  return toView(poll, false);
}

async function loadHostPoll(id: string, hostId: string, isAdmin: boolean): Promise<LoadedPoll> {
  const poll = await findPoll({ id });
  // Un sondage d'un autre animateur est « introuvable » plutôt qu'interdit (pas d'énumération).
  if (!poll || (poll.hostId !== hostId && !isAdmin)) throw new PollError('Vote introuvable', 404);
  return poll;
}

export async function getHostPollView(
  id: string,
  hostId: string,
  isAdmin: boolean
): Promise<HostPollView> {
  const poll = await loadHostPoll(id, hostId, isAdmin);
  return { id: poll.id, ...toView(poll, true) };
}

export async function listHostPolls(hostId: string): Promise<HostPollSummary[]> {
  const polls = await prisma.poll.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { options: true } },
    },
  });
  return polls.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    status: p.status as HostPollSummary['status'],
    optionCount: p._count.options,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function createPoll(
  hostId: string,
  input: { title: string; participants: string[]; requireOAuth: boolean }
) {
  // Collision de code improbable (31^6 ≈ 887 millions) : quelques essais suffisent.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePollCode(randomInt);
    const taken = await prisma.poll.findUnique({ where: { code }, select: { id: true } });
    if (taken) continue;
    return prisma.poll.create({
      data: {
        code,
        title: input.title,
        hostId,
        requireOAuth: input.requireOAuth,
        options: { create: input.participants.map((label, position) => ({ label, position })) },
      },
      select: { id: true, code: true },
    });
  }
  throw new PollError('Impossible de générer un code de vote, réessaie', 409);
}

export async function deletePoll(id: string, hostId: string, isAdmin: boolean) {
  await loadHostPoll(id, hostId, isAdmin);
  await prisma.poll.delete({ where: { id } });
}

export type PollAction =
  | { action: 'start'; durationSec: number }
  | { action: 'close' }
  | { action: 'extend'; seconds: number }
  | { action: 'reveal' }
  | { action: 'tiebreak'; durationSec: number }
  | { action: 'draw' };

function requireEndedRound(poll: LoadedPoll): LoadedRound {
  const round = poll.rounds[0];
  if (!round) throw new PollError("Le vote n'a pas commencé", 409);
  if (isRoundOpen(round)) throw new PollError('La manche est encore ouverte', 409);
  return round;
}

function requireTie(poll: LoadedPoll, round: LoadedRound): string[] {
  const outcome = roundOutcome(poll, round);
  if (outcome.kind !== 'tie' || outcome.tiedIds.length < 2) {
    throw new PollError("Il n'y a pas d'égalité à départager", 409);
  }
  return outcome.tiedIds;
}

async function openRound(pollId: string, number: number, optionIds: string[], durationSec: number) {
  await prisma.$transaction([
    prisma.pollRound.create({
      data: {
        pollId,
        number,
        endsAt: new Date(Date.now() + durationSec * 1000),
        candidates: { create: optionIds.map((optionId) => ({ optionId })) },
      },
    }),
    prisma.poll.update({ where: { id: pollId }, data: { status: POLL_STATUS.ACTIVE } }),
  ]);
}

export async function applyPollAction(
  id: string,
  hostId: string,
  isAdmin: boolean,
  command: PollAction
): Promise<void> {
  const poll = await loadHostPoll(id, hostId, isAdmin);
  if (poll.status === POLL_STATUS.FINISHED) throw new PollError('Ce vote est terminé', 409);
  const round = poll.rounds[0];

  switch (command.action) {
    case 'start': {
      if (round) throw new PollError('Le vote a déjà commencé', 409);
      await openRound(
        poll.id,
        1,
        poll.options.map((o) => o.id),
        command.durationSec
      );
      return;
    }
    case 'close':
    case 'extend': {
      if (!round || !isRoundOpen(round)) throw new PollError("Aucune manche n'est ouverte", 409);
      const endsAt =
        command.action === 'close'
          ? new Date()
          : new Date(round.endsAt.getTime() + command.seconds * 1000);
      await prisma.pollRound.update({ where: { id: round.id }, data: { endsAt } });
      return;
    }
    case 'reveal': {
      const ended = requireEndedRound(poll);
      const outcome = roundOutcome(poll, ended);
      await prisma.$transaction([
        prisma.pollRound.update({ where: { id: ended.id }, data: { resultsRevealed: true } }),
        ...(outcome.kind === 'winner'
          ? [
              prisma.poll.update({
                where: { id: poll.id },
                data: { status: POLL_STATUS.FINISHED, winnerOptionId: outcome.winnerId },
              }),
            ]
          : []),
      ]);
      return;
    }
    case 'tiebreak': {
      const ended = requireEndedRound(poll);
      const tiedIds = requireTie(poll, ended);
      await openRound(poll.id, ended.number + 1, tiedIds, command.durationSec);
      return;
    }
    case 'draw': {
      const ended = requireEndedRound(poll);
      const tiedIds = requireTie(poll, ended);
      const winnerId = tiedIds[randomInt(tiedIds.length)];
      await prisma.$transaction([
        prisma.pollRound.update({ where: { id: ended.id }, data: { resultsRevealed: true } }),
        prisma.poll.update({
          where: { id: poll.id },
          data: { status: POLL_STATUS.FINISHED, winnerOptionId: winnerId, winnerByDraw: true },
        }),
      ]);
      return;
    }
  }
}

async function findCurrentRound(code: string) {
  const poll = await prisma.poll.findUnique({
    where: { code },
    select: {
      id: true,
      status: true,
      requireOAuth: true,
      rounds: {
        orderBy: { number: 'desc' },
        take: 1,
        select: { id: true, endsAt: true, candidates: { select: { optionId: true } } },
      },
    },
  });
  if (!poll) throw new PollError('Vote introuvable', 404);
  return { poll, round: poll.rounds[0] ?? null };
}

/** Voix de l'utilisateur dans la manche en cours (null s'il n'a pas voté). */
export async function getMyVote(code: string, userId: string): Promise<string | null> {
  const { round } = await findCurrentRound(code);
  if (!round) return null;
  const vote = await prisma.pollVote.findUnique({
    where: { roundId_userId: { roundId: round.id, userId } },
    select: { optionId: true },
  });
  return vote?.optionId ?? null;
}

/** Enregistre ou change la voix de l'utilisateur tant que la manche est ouverte. */
export async function castVote(code: string, userId: string, optionId: string): Promise<void> {
  const { poll, round } = await findCurrentRound(code);
  if (poll.status !== POLL_STATUS.ACTIVE || !round || !isRoundOpen(round)) {
    throw new PollError("Le vote n'est pas ouvert", 409);
  }
  if (!round.candidates.some((c) => c.optionId === optionId)) {
    throw new PollError('Ce participant ne fait pas partie de cette manche', 400);
  }
  if (poll.requireOAuth) {
    // Limite les comptes jetables : un compte email sans vérification se crée en boucle.
    const linked = await prisma.account.count({ where: { userId } });
    if (linked === 0) {
      throw new PollError('Ce vote demande un compte relié à Twitch ou Google', 403);
    }
  }
  await prisma.pollVote.upsert({
    where: { roundId_userId: { roundId: round.id, userId } },
    create: { roundId: round.id, userId, optionId },
    update: { optionId },
  });
}

/**
 * Droits d'animation relus en base (pas dans le jeton de session, pour qu'un retrait
 * s'applique tout de suite) : admin, ou utilisateur à qui un admin a donné le droit.
 */
export async function getPollHostAccess(
  userId: string
): Promise<{ canHost: boolean; isAdmin: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, canHostPolls: true },
  });
  const isAdmin = user?.role === 'ADMIN';
  return { canHost: isAdmin || user?.canHostPolls === true, isAdmin };
}
