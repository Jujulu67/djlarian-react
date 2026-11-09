'use client';

import { Check, Loader2, LogIn, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { openAuthModal } from '@/lib/auth/openAuthModal';
import type { PollRoundView, PollView } from '@/lib/polls/types';
import { cn } from '@/lib/utils/cn';

import {
  Countdown,
  outcomeIds,
  panelClass,
  pollRefreshInterval,
  PollResults,
  roundLabel,
  tieLabels,
} from '../components/PollWidgets';
import { useCountdown, usePolledData } from '../hooks/usePolledData';

function useMyVote(code: string, roundNumber: number | undefined, signedIn: boolean) {
  // La voix est rattachée à sa manche : une nouvelle manche repart d'une voix vide.
  const [state, setState] = useState<{ round: number; optionId: string | null } | null>(null);

  useEffect(() => {
    if (!signedIn || roundNumber === undefined) return;
    let cancelled = false;
    fetch(`/api/polls/public/${code}/vote`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.data)
          setState({ round: roundNumber, optionId: body.data.optionId });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, roundNumber, signedIn]);

  const myVote = state && state.round === roundNumber ? state.optionId : null;
  const setMyVote = useCallback(
    (optionId: string | null) => {
      if (roundNumber !== undefined) setState({ round: roundNumber, optionId });
    },
    [roundNumber]
  );
  return [myVote, setMyVote] as const;
}

function Ballot({
  code,
  round,
  signedIn,
  myVote,
  onVoted,
}: Readonly<{
  code: string;
  round: PollRoundView;
  signedIn: boolean;
  myVote: string | null;
  onVoted: (optionId: string | null) => void;
}>) {
  const [pending, setPending] = useState<string | null>(null);

  const vote = useCallback(
    async (optionId: string) => {
      if (!signedIn) {
        openAuthModal();
        return;
      }
      const previous = myVote;
      setPending(optionId);
      onVoted(optionId);
      try {
        const response = await fetch(`/api/polls/public/${code}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          onVoted(previous);
          toast.error(body.error ?? "Le vote n'a pas été pris en compte");
        }
      } catch {
        onVoted(previous);
        toast.error('Connexion perdue, réessaie');
      } finally {
        setPending(null);
      }
    },
    [code, myVote, onVoted, signedIn]
  );

  return (
    <fieldset>
      <legend className="sr-only">Choisis un participant</legend>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {round.candidates.map((candidate) => {
          const selected = myVote === candidate.id;
          return (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => void vote(candidate.id)}
                disabled={pending !== null}
                aria-pressed={selected}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
                  selected
                    ? 'border-purple-400 bg-purple-500/25 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/90 hover:border-white/25 hover:bg-white/[0.07]'
                )}
              >
                <span className="truncate">{candidate.label}</span>
                {pending === candidate.id && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                )}
                {selected && pending !== candidate.id && (
                  <Check className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {signedIn ? (
        <p className="mt-4 text-sm text-white/50">
          {myVote
            ? "Vote enregistré. Tu peux en changer jusqu'à la fin du temps."
            : 'Un vote par personne, modifiable jusqu’à la fin du temps.'}
        </p>
      ) : (
        <Button className="mt-5" onClick={openAuthModal}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Se connecter pour voter
        </Button>
      )}
    </fieldset>
  );
}

function RoundBody({
  view,
  round,
  seconds,
  signedIn,
  myVote,
  onVoted,
}: Readonly<{
  view: PollView;
  round: PollRoundView;
  seconds: number;
  signedIn: boolean;
  myVote: string | null;
  onVoted: (optionId: string | null) => void;
}>) {
  const open = round.isOpen && seconds > 0;
  if (open) {
    return (
      <Ballot
        code={view.code}
        round={round}
        signedIn={signedIn}
        myVote={myVote}
        onVoted={onVoted}
      />
    );
  }
  if (!round.results) {
    return <p className="text-white/70">Vote clos. Les résultats arrivent…</p>;
  }
  const tie = view.status !== 'FINISHED' && round.outcome?.kind === 'tie';
  return (
    <div className="flex flex-col gap-4">
      {tie && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-100">
          Égalité entre {tieLabels(round)} : un départage arrive.
        </p>
      )}
      <PollResults results={round.results} highlightIds={outcomeIds(round)} />
    </div>
  );
}

export default function VotePage({ code }: Readonly<{ code: string }>) {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const {
    data: view,
    error,
    clockOffsetMs,
  } = usePolledData<PollView>(`/api/polls/public/${code}`, pollRefreshInterval);
  const round = view?.round ?? null;
  const seconds = useCountdown(round?.isOpen ? round.endsAt : null, clockOffsetMs);
  const [myVote, setMyVote] = useMyVote(code, round?.number, signedIn);

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        {error ? (
          <p className="text-white/70">{error.message}</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-white/50" aria-label="Chargement" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:py-16">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
          {round ? roundLabel(round) : 'Vote'} · par {view.hostName}
        </p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">{view.title}</h1>
      </header>

      {view.winner && (
        <div className={cn(panelClass, 'border-amber-300/40 text-center')}>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200/80">Gagnant</p>
          <p className="mt-1 text-3xl font-bold text-white">{view.winner.label}</p>
          {view.winner.byDraw && (
            <p className="mt-1 text-sm text-white/60">
              Désigné par tirage au sort parmi les ex æquo
            </p>
          )}
        </div>
      )}

      <section className={panelClass} aria-live="polite">
        {round ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              {round.isOpen && seconds > 0 ? (
                <Countdown seconds={seconds} className="text-2xl" />
              ) : (
                <span className="text-white/60">Temps écoulé</span>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
                <Users className="h-4 w-4" aria-hidden="true" />
                {round.voterCount} {round.voterCount > 1 ? 'votes' : 'vote'}
              </span>
            </div>
            <RoundBody
              view={view}
              round={round}
              seconds={seconds}
              signedIn={signedIn}
              myVote={myVote}
              onVoted={setMyVote}
            />
          </>
        ) : (
          <p className="text-white/70">
            Le vote n&apos;a pas encore commencé. Reste sur cette page, il s&apos;ouvrira tout seul.
          </p>
        )}
      </section>
    </div>
  );
}
