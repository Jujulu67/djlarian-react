'use client';

import { Crown, Timer } from 'lucide-react';

import { formatCountdown } from '@/lib/polls/rules';
import type { PollResultEntry, PollRoundView, PollView } from '@/lib/polls/types';
import { cn } from '@/lib/utils/cn';

export const panelClass =
  'rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md md:p-6';

/** Intervalle de relecture : rapide pendant une manche, lent sinon, aucun une fois fini. */
export function pollRefreshInterval(view: PollView | null, fastMs = 2000): number | null {
  if (!view) return fastMs;
  if (view.status === 'FINISHED') return null;
  return view.round?.isOpen ? fastMs : fastMs * 2;
}

export function roundLabel(round: PollRoundView): string {
  return round.number === 1 ? 'Vote' : `Départage · manche ${round.number}`;
}

export function Countdown({
  seconds,
  className,
}: Readonly<{ seconds: number; className?: string }>) {
  const urgent = seconds > 0 && seconds <= 10;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono tabular-nums',
        urgent ? 'text-red-400' : 'text-white',
        className
      )}
      role="timer"
      aria-live="off"
    >
      <Timer className="h-[0.8em] w-[0.8em]" aria-hidden="true" />
      {formatCountdown(seconds)}
    </span>
  );
}

/** Barres de résultats ; les ex æquo en tête sont mis en avant. */
export function PollResults({
  results,
  highlightIds,
  compact = false,
}: Readonly<{ results: PollResultEntry[]; highlightIds: string[]; compact?: boolean }>) {
  const total = results.reduce((sum, r) => sum + r.votes, 0);
  return (
    <ol className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-2.5')}>
      {results.map((entry) => {
        const share = total === 0 ? 0 : Math.round((entry.votes / total) * 100);
        const highlighted = highlightIds.includes(entry.optionId);
        return (
          <li
            key={entry.optionId}
            className={cn(
              'relative overflow-hidden rounded-xl border px-4',
              compact ? 'py-1.5 text-sm' : 'py-2.5',
              highlighted ? 'border-purple-400/60' : 'border-white/10'
            )}
          >
            <span
              className={cn(
                'absolute inset-y-0 left-0 transition-[width] duration-700',
                highlighted ? 'bg-purple-500/35' : 'bg-white/10'
              )}
              style={{ width: `${share}%` }}
              aria-hidden="true"
            />
            <span className="relative flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 font-medium">
                {highlighted && (
                  <Crown className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                )}
                <span className="truncate">{entry.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-white/70">
                {entry.votes} voix · {share} %
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Ids à mettre en avant : gagnant ou ex æquo. */
export function outcomeIds(round: PollRoundView | null): string[] {
  if (!round?.outcome) return [];
  return round.outcome.kind === 'winner' ? [round.outcome.winnerId] : round.outcome.tiedIds;
}

export function tieLabels(round: PollRoundView): string {
  const ids = outcomeIds(round);
  return round.candidates
    .filter((c) => ids.includes(c.id))
    .map((c) => c.label)
    .join(', ');
}
