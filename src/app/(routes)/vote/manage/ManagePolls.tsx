'use client';

import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { openAuthModal } from '@/lib/auth/openAuthModal';
import { parseParticipants, POLL_LIMITS } from '@/lib/polls/rules';
import type { HostPollSummary } from '@/lib/polls/types';
import { cn } from '@/lib/utils/cn';

import { panelClass } from '../components/PollWidgets';
import { usePolledData } from '../hooks/usePolledData';

const STATUS_LABELS: Record<HostPollSummary['status'], string> = {
  DRAFT: 'Prêt à lancer',
  ACTIVE: 'En cours',
  FINISHED: 'Terminé',
};

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-purple-400 focus:outline-none';

function CreatePollForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rawParticipants, setRawParticipants] = useState('');
  const [requireOAuth, setRequireOAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const participants = useMemo(() => parseParticipants(rawParticipants), [rawParticipants]);
  const tooMany = participants.length > POLL_LIMITS.maxOptions;
  const canSubmit =
    title.trim() !== '' && participants.length >= POLL_LIMITS.minOptions && !tooMany && !submitting;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), participants, requireOAuth }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Création impossible');
      router.push(`/vote/manage/${body.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className={cn(panelClass, 'flex flex-col gap-5')}>
      <h2 className="text-xl font-semibold text-white">Nouveau vote</h2>
      <div>
        <label htmlFor="poll-title" className="mb-1.5 block text-sm text-white/70">
          Titre
        </label>
        <input
          id="poll-title"
          className={inputClass}
          value={title}
          maxLength={POLL_LIMITS.titleMaxLength}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Concours du 12 novembre"
        />
      </div>
      <div>
        <label htmlFor="poll-participants" className="mb-1.5 block text-sm text-white/70">
          Participants : colle la liste, un nom par ligne (ou séparés par des virgules)
        </label>
        <textarea
          id="poll-participants"
          className={cn(inputClass, 'min-h-40 font-mono text-sm')}
          value={rawParticipants}
          onChange={(e) => setRawParticipants(e.target.value)}
          placeholder={'1. Pseudo A\n2. Pseudo B\n3. Pseudo C'}
        />
        <p className={cn('mt-2 text-sm', tooMany ? 'text-red-400' : 'text-white/50')}>
          {participants.length} participant{participants.length > 1 ? 's' : ''} détecté
          {participants.length > 1 ? 's' : ''}
          {tooMany && ` (${POLL_LIMITS.maxOptions} maximum)`} · numéros, puces et doublons retirés
        </p>
        {participants.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Aperçu des participants">
            {participants.map((label) => (
              <li key={label} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/90">
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <label className="flex items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-purple-500"
          checked={requireOAuth}
          onChange={(e) => setRequireOAuth(e.target.checked)}
        />
        <span>
          Réserver le vote aux comptes reliés à Twitch ou Google
          <span className="block text-white/50">
            Recommandé : un compte email se crée en quelques secondes, donc plusieurs votes par
            personne.
          </span>
        </span>
      </label>
      <Button type="submit" disabled={!canSubmit} className="self-start">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        Créer le vote
      </Button>
    </form>
  );
}

function PollList({ polls }: Readonly<{ polls: HostPollSummary[] }>) {
  if (polls.length === 0) return null;
  return (
    <section className={panelClass}>
      <h2 className="mb-4 text-xl font-semibold text-white">Mes votes</h2>
      <ul className="divide-y divide-white/10">
        {polls.map((poll) => (
          <li key={poll.id}>
            <Link
              href={`/vote/manage/${poll.id}`}
              className="flex items-center justify-between gap-4 py-3 text-white/90 hover:text-white"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{poll.title}</span>
                <span className="text-sm text-white/50">
                  {poll.optionCount} participants · code {poll.code} ·{' '}
                  {new Date(poll.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs">
                {STATUS_LABELS[poll.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ManagePolls() {
  const { status } = useSession();
  const { data: polls, error } = usePolledData<HostPollSummary[]>('/api/polls', null);

  if (status === 'unauthenticated') {
    return (
      <div className={cn(panelClass, 'text-center')}>
        <p className="mb-4 text-white/80">Connecte-toi pour animer un vote.</p>
        <Button onClick={openAuthModal}>Se connecter</Button>
      </div>
    );
  }
  if (error?.status === 403) {
    return (
      <p className={cn(panelClass, 'text-white/80')}>
        Ton compte n&apos;a pas encore le droit d&apos;animer des votes : demande-le à l&apos;admin
        du site.
      </p>
    );
  }
  if (!polls) {
    return (
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-white/50" aria-label="Chargement" />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <CreatePollForm />
      <PollList polls={polls} />
    </div>
  );
}
