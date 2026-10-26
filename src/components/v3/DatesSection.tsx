import Link from 'next/link';

import type { Event } from '@/types';

import SectionIndex from './SectionIndex';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Paris',
});

/**
 * Dates de l'accueil v3 : une pilule de verre par date (date, lieu, billet).
 * Sans date à venir, la section devient un appel au booking plutôt qu'un état vide.
 */
export default function DatesSection({ events }: { events: Event[] }) {
  return (
    <section className="relative mx-auto max-w-[1440px] px-4 py-20 md:px-8 md:py-28">
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
          {events.map((event) => (
            <li key={event.id}>
              <div className="surface-1 group flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[2rem] py-3 pl-6 pr-3 md:rounded-full">
                <span className="min-w-[5.5rem] font-mono-signal text-base text-white">
                  {dateFormatter.format(new Date(event.date))}
                </span>
                <Link href={`/events/${event.id}`} className="min-w-0 flex-[1_1_240px]">
                  <span className="text-[19px] font-bold text-white">{event.title}</span>
                  <span className="text-white/70"> · {event.location}</span>
                </Link>
                {event.ticketUrl ? (
                  <a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center rounded-full bg-[rgb(var(--ink))] px-6 text-sm font-bold text-[rgb(7_7_13)] transition-transform hover:-translate-y-0.5"
                  >
                    Billets
                  </a>
                ) : (
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-bold text-white transition-colors hover:border-white/40"
                  >
                    Détails
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
