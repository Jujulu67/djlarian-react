'use client';

import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { PollView } from '@/lib/polls/types';

import {
  Countdown,
  outcomeIds,
  pollRefreshInterval,
  PollResults,
  roundLabel,
  tieLabels,
} from '../../components/PollWidgets';
import { useCountdown, usePolledData } from '../../hooks/usePolledData';

/** Fond transparent pour la source navigateur d'OBS (le site a un fond noir). */
function useTransparentBackground() {
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const previous = targets.map((el) => el.style.background);
    targets.forEach((el) => el.style.setProperty('background', 'transparent', 'important'));
    return () => targets.forEach((el, i) => (el.style.background = previous[i]));
  }, []);
}

function OverlayStatus({ view, seconds }: Readonly<{ view: PollView; seconds: number }>) {
  const round = view.round;
  if (view.winner) {
    return (
      <p className="text-2xl font-bold">
        🏆 {view.winner.label}
        {view.winner.byDraw && (
          <span className="ml-2 text-sm font-normal text-white/60">(tirage au sort)</span>
        )}
      </p>
    );
  }
  if (!round) return <p className="text-white/80">Le vote va commencer</p>;
  if (round.isOpen && seconds > 0)
    return <Countdown seconds={seconds} className="text-3xl font-bold" />;
  if (round.outcome?.kind === 'tie') {
    return <p className="font-semibold text-amber-200">Égalité : {tieLabels(round)}</p>;
  }
  return <p className="text-white/80">Vote clos</p>;
}

/** L'overlay reste ouvert pendant tout le live : relecture lente une fois le vote fini. */
function overlayInterval(view: PollView | null): number {
  return pollRefreshInterval(view) ?? 15000;
}

export default function OverlayView({ code }: Readonly<{ code: string }>) {
  useTransparentBackground();
  const { data: view, clockOffsetMs } = usePolledData<PollView>(
    `/api/polls/public/${code}`,
    overlayInterval
  );
  const round = view?.round ?? null;
  const seconds = useCountdown(round?.isOpen ? round.endsAt : null, clockOffsetMs);
  const [voteUrl, setVoteUrl] = useState(`/vote/${code}`);

  useEffect(() => {
    setVoteUrl(`${window.location.host}/vote/${code}`);
  }, [code]);

  if (!view) return null;
  const showVoteUrl = !view.winner && (!round || round.isOpen);

  return (
    <div className="w-[460px] p-4 text-white">
      <div className="rounded-2xl border border-white/15 bg-black/70 p-5 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
          {round ? roundLabel(round) : 'Vote'}
        </p>
        <p className="mt-1 truncate text-lg font-bold">{view.title}</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <OverlayStatus view={view} seconds={seconds} />
          {round && (
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <Users className="h-4 w-4" aria-hidden="true" />
              {round.voterCount}
            </span>
          )}
        </div>
        {round?.results && (
          <div className="mt-4">
            <PollResults
              results={round.results.slice(0, 6)}
              highlightIds={outcomeIds(round)}
              compact
            />
          </div>
        )}
        {showVoteUrl && (
          <p className="mt-4 rounded-lg bg-purple-500/20 px-3 py-2 text-center font-semibold">
            Vote sur {voteUrl}
          </p>
        )}
      </div>
    </div>
  );
}
