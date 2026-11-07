import Link from 'next/link';

import type { Event } from '@/types';

import SectionIndex from './SectionIndex';

const PARIS = { timeZone: 'Europe/Paris' } as const;
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { ...PARIS, day: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat('fr-FR', { ...PARIS, month: 'short' });
const whenFormatter = new Intl.DateTimeFormat('fr-FR', {
  ...PARIS,
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Dates de l'accueil v3 : une ligne de verre par date (bloc jour/mois, titre, jour et
 * heure, lieu). Toute la ligne mène à l'événement ; le bouton « Billets » reste à part.
 * Sans date à venir, la section devient un appel au booking plutôt qu'un état vide.
 */
export default function DatesSection({ events }: Readonly<{ events: Event[] }>) {
  return (
    <section className="relative mx-auto max-w-[1180px] px-4 py-12 md:py-16">
      <SectionIndex eyebrow="Agenda" label="Dates" href="/events" linkLabel="Tout l'agenda" />

      {events.length === 0 ? (
        <div className="surface-1 mt-9 flex flex-col items-start gap-5 rounded-[1.6rem] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <p className="max-w-xl text-lg text-white/80">
            Pas de date annoncée pour l&apos;instant. La saison se programme maintenant.
          </p>
          <a
            href="mailto:booking@larian.com"
            className="chrome-pill inline-flex h-12 items-center rounded-full px-7 text-[15px] font-bold"
          >
            Booker Larian
          </a>
        </div>
      ) : (
        <ul className="mt-9 grid gap-3">
          {events.map((event) => {
            const date = new Date(event.date);
            return (
              <li key={event.id}>
                <div className="surface-1 group relative flex items-center gap-4 rounded-[1.4rem] p-3 pr-4 transition-colors hover:border-white/20 hover:bg-white/[0.06] md:gap-6 md:pr-3">
                  <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[1rem] bg-white/[0.05] ring-1 ring-inset ring-white/10">
                    <span className="text-display text-2xl leading-none text-white">
                      {dayFormatter.format(date)}
                    </span>
                    <span className="mt-1 font-mono-signal text-[11px] uppercase text-[rgb(var(--ice))]">
                      {monthFormatter.format(date).replace('.', '')}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/events/${event.id}`}
                      className="block truncate text-lg font-bold text-white after:absolute after:inset-0 after:rounded-[1.4rem] md:text-[19px]"
                    >
                      {event.title}
                    </Link>
                    <span className="mt-1 block truncate text-sm text-white/65">
                      <span className="capitalize">{whenFormatter.format(date)}</span>
                      {event.location && <> · {event.location}</>}
                    </span>
                  </span>

                  {event.ticketUrl ? (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 inline-flex h-11 shrink-0 items-center rounded-full bg-[rgb(var(--ink))] px-5 text-sm font-bold text-[rgb(7_7_13)] transition-transform hover:-translate-y-0.5 md:px-6"
                    >
                      Billets
                    </a>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full text-sm font-bold text-white/80 transition-colors group-hover:text-white md:border md:border-white/20 md:px-6 md:group-hover:border-white/40"
                    >
                      <span className="hidden md:inline">Détails</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
