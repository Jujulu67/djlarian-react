'use client';

import {
  ArrowLeft,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Plus,
  Square,
  Swords,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import type { PollAction } from '@/lib/polls/service';
import { formatCountdown, POLL_LIMITS } from '@/lib/polls/rules';
import type { HostPollView, PollRoundView } from '@/lib/polls/types';
import { cn } from '@/lib/utils/cn';

import {
  Countdown,
  outcomeIds,
  panelClass,
  pollRefreshInterval,
  PollResults,
  roundLabel,
  tieLabels,
} from '../../components/PollWidgets';
import { useCountdown, usePolledData } from '../../hooks/usePolledData';

const DURATION_PRESETS = [30, 60, 120, 180, 300];

function CopyField({ label, value }: Readonly<{ label: string; value: string }>) {
  const copy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success('Copié'))
      .catch(() => toast.error('Copie impossible'));
  };
  return (
    <div>
      <p className="mb-1 text-sm text-white/60">{label}</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 text-sm text-white/90">
          {value}
        </code>
        <Button variant="outline" size="icon" onClick={copy} aria-label={`Copier : ${label}`}>
          <Copy className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function DurationPicker({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (seconds: number) => void }>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-white/60">Durée de la manche</legend>
      <div className="flex flex-wrap items-center gap-2">
        {DURATION_PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onChange(seconds)}
            aria-pressed={value === seconds}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm tabular-nums transition-colors',
              value === seconds
                ? 'border-purple-400 bg-purple-500/25 text-white'
                : 'border-white/10 text-white/70 hover:border-white/30'
            )}
          >
            {formatCountdown(seconds)}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm text-white/60">
          ou
          <input
            type="number"
            min={POLL_LIMITS.minDurationSec}
            max={POLL_LIMITS.maxDurationSec}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-white"
            aria-label="Durée personnalisée en secondes"
          />
          s
        </label>
      </div>
    </fieldset>
  );
}

function PrivateTally({ round }: Readonly<{ round: PollRoundView }>) {
  const [visible, setVisible] = useState(false);
  if (!round.results) return null;
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setVisible((v) => !v)}>
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        {visible ? 'Masquer' : 'Voir'} les résultats (pour toi seul)
      </Button>
      {visible && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-amber-200/80">
            Attention si ton écran est partagé en live.
          </p>
          <PollResults
            results={round.results}
            highlightIds={round.isOpen ? [] : outcomeIds(round)}
          />
        </div>
      )}
    </div>
  );
}

function RoundControls({
  view,
  seconds,
  busy,
  run,
}: Readonly<{
  view: HostPollView;
  seconds: number;
  busy: boolean;
  run: (action: PollAction) => void;
}>) {
  const [duration, setDuration] = useState(60);
  const round = view.round;
  const validDuration =
    Number.isInteger(duration) &&
    duration >= POLL_LIMITS.minDurationSec &&
    duration <= POLL_LIMITS.maxDurationSec;

  if (view.status === 'FINISHED') {
    return round?.results ? (
      <PollResults results={round.results} highlightIds={outcomeIds(round)} />
    ) : null;
  }

  if (!round) {
    return (
      <div className="flex flex-col gap-4">
        <DurationPicker value={duration} onChange={setDuration} />
        <Button
          className="self-start"
          disabled={busy || !validDuration}
          onClick={() => run({ action: 'start', durationSec: duration })}
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Lancer le vote
        </Button>
      </div>
    );
  }

  if (round.isOpen && seconds > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run({ action: 'extend', seconds: 30 })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            30 s
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => run({ action: 'close' })}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Clore maintenant
          </Button>
        </div>
        <PrivateTally round={round} />
      </div>
    );
  }

  // Départage proposé après la révélation, pour ne rien laisser voir avant à l'écran partagé
  const isTie =
    round.resultsRevealed && round.outcome?.kind === 'tie' && outcomeIds(round).length >= 2;
  return (
    <div className="flex flex-col gap-5">
      {!round.resultsRevealed && (
        <Button className="self-start" disabled={busy} onClick={() => run({ action: 'reveal' })}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          Révéler les résultats
        </Button>
      )}
      {round.resultsRevealed && round.results && (
        <PollResults results={round.results} highlightIds={outcomeIds(round)} />
      )}
      {!round.resultsRevealed && <PrivateTally round={round} />}
      {isTie && (
        <div className="flex flex-col gap-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="text-amber-100">
            Égalité entre {tieLabels(round)}. Nouvelle manche avec eux seuls, ou tirage au sort.
          </p>
          <DurationPicker value={duration} onChange={setDuration} />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !validDuration}
              onClick={() => run({ action: 'tiebreak', durationSec: duration })}
            >
              <Swords className="h-4 w-4" aria-hidden="true" />
              Lancer le départage
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => run({ action: 'draw' })}>
              <Dices className="h-4 w-4" aria-hidden="true" />
              Tirer au sort
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagePoll({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const {
    data: view,
    error,
    clockOffsetMs,
    apply,
  } = usePolledData<HostPollView>(`/api/polls/${id}`, pollRefreshInterval);
  const round = view?.round ?? null;
  const seconds = useCountdown(round?.isOpen ? round.endsAt : null, clockOffsetMs);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(window.location.origin), []);

  const run = useCallback(
    async (action: PollAction) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/polls/${id}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? 'Action impossible');
        apply(body.data as HostPollView);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action impossible');
      } finally {
        setBusy(false);
      }
    },
    [id, apply]
  );

  const remove = async () => {
    if (!window.confirm('Supprimer ce vote et tous ses résultats ?')) return;
    const response = await fetch(`/api/polls/${id}`, { method: 'DELETE' });
    if (response.ok) router.push('/vote/manage');
    else toast.error('Suppression impossible');
  };

  if (!view) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        {error ? (
          <p className="text-white/70">{error.message}</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-white/50" aria-label="Chargement" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/vote/manage"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mes votes
      </Link>
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
          {round ? roundLabel(round) : 'Prêt à lancer'} · code {view.code}
        </p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">{view.title}</h1>
      </header>

      {view.winner && (
        <div className={cn(panelClass, 'border-amber-300/40 text-center')}>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200/80">Gagnant</p>
          <p className="mt-1 text-3xl font-bold text-white">{view.winner.label}</p>
          {view.winner.byDraw && <p className="mt-1 text-sm text-white/60">Tiré au sort</p>}
        </div>
      )}

      <section className={panelClass} aria-live="polite">
        {round && (
          <div className="mb-5 flex items-center justify-between gap-4">
            {round.isOpen && seconds > 0 ? (
              <Countdown seconds={seconds} className="text-3xl" />
            ) : (
              <span className="text-white/60">
                {round.resultsRevealed ? 'Résultats révélés' : 'Temps écoulé, résultats cachés'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <Users className="h-4 w-4" aria-hidden="true" />
              {round.voterCount} {round.voterCount > 1 ? 'votes' : 'vote'}
            </span>
          </div>
        )}
        <RoundControls view={view} seconds={seconds} busy={busy} run={(a) => void run(a)} />
      </section>

      <section className={cn(panelClass, 'flex flex-col gap-4')}>
        <h2 className="text-lg font-semibold text-white">Partager</h2>
        <CopyField
          label="Lien de vote (à mettre dans le chat)"
          value={`${origin}/vote/${view.code}`}
        />
        <CopyField
          label="Overlay OBS : source navigateur, 480 × 600, fond transparent"
          value={`${origin}/vote/${view.code}/overlay`}
        />
        <p className="text-sm text-white/50">
          {view.requireOAuth
            ? 'Vote réservé aux comptes reliés à Twitch ou Google.'
            : 'Vote ouvert à tous les comptes du site.'}{' '}
          {round ? `${round.candidates.length} en lice.` : ''}
        </p>
      </section>

      <Button variant="ghost" className="self-start text-red-300" onClick={() => void remove()}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Supprimer ce vote
      </Button>
    </div>
  );
}
