import type { PollStatus, RoundOutcome } from './rules';

export type PollResultEntry = { optionId: string; label: string; votes: number };

export type PollRoundView = {
  number: number;
  endsAt: string;
  isOpen: boolean;
  resultsRevealed: boolean;
  voterCount: number;
  candidates: Array<{ id: string; label: string }>;
  /** Null tant que les résultats sont masqués au public. */
  results: PollResultEntry[] | null;
  /** Gagnant ou ex æquo, connu une fois la manche finie (et révélée pour le public). */
  outcome: RoundOutcome | null;
};

export type PollView = {
  code: string;
  title: string;
  status: PollStatus;
  hostName: string;
  requireOAuth: boolean;
  round: PollRoundView | null;
  winner: { label: string; byDraw: boolean } | null;
  /** Heure du serveur, pour caler la minuterie des clients. */
  serverNow: string;
};

export type HostPollView = PollView & { id: string };

export type HostPollSummary = {
  id: string;
  code: string;
  title: string;
  status: PollStatus;
  optionCount: number;
  createdAt: string;
};
