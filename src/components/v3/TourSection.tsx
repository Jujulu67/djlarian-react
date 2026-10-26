import Link from 'next/link';

import type { Event } from '@/types';

import SectionIndex from './SectionIndex';

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'Europe/Paris' });
const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  timeZone: 'Europe/Paris',
});
const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

/**
 * Dates en liste de tournée : la date en grand, le lieu, et le billet.
 * Sans date à venir, la section devient un appel au booking plutôt qu'un état vide.
 */
export default function TourSection({ events, index = '02' }: { events: Event[]; index?: string }) {
  return (
    <section className="relative mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-32">
      <SectionIndex index={index} label="Dates" href="/events" linkLabel="Tout l'agenda" />

      {events.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-6 rule-t pt-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-xl text-2xl leading-snug text-white/80">
            Pas de date annoncée pour l&apos;instant. La saison se programme maintenant.
          </p>
          <a
            href="mailto:booking@larian.com"
            className="inline-flex h-12 items-center gap-3 bg-[rgb(var(--ink))] px-6 text-sm font-medium text-[rgb(5_5_6)] transition-colors hover:bg-white"
          >
            Booker Larian →
          </a>
        </div>
      ) : (
        <ul className="mt-10 rule-t">
          {events.map((event) => {
            const date = new Date(event.date);
            return (
              <li key={event.id} className="rule-b">
                <div className="group grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 py-6 md:grid-cols-[10rem_1fr_auto] md:py-8">
                  <div className="flex items-baseline gap-2 font-mono-signal uppercase">
                    <span className="text-5xl leading-none text-white md:text-6xl">
                      {dayFormatter.format(date)}
                    </span>
                    <span className="text-sm text-white/60">
                      {monthFormatter.format(date).replace('.', '')}
                    </span>
                  </div>
                  <Link href={`/events/${event.id}`} className="min-w-0">
                    <span className="block truncate text-display text-2xl text-white md:text-4xl">
                      {event.title}
                    </span>
                    <span className="mt-2 block font-mono-signal text-[11px] uppercase text-white/60">
                      {event.location} · {weekdayFormatter.format(date)}
                    </span>
                  </Link>
                  <div className="col-span-2 md:col-span-1">
                    {event.ticketUrl ? (
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-[rgb(5_5_6)]"
                      >
                        Billets ↗
                      </a>
                    ) : (
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex h-11 items-center gap-2 border border-white/15 px-5 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                      >
                        Détails →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
