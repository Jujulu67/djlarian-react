'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

import { easeOutExpo } from '@/lib/motion';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import type { Track } from '@/lib/utils/types';
import type { Event } from '@/types';
import type { HomepageConfig } from '@/types/config';

import Marquee from './Marquee';
import ParisClock from './ParisClock';
import SignalWave from './SignalWave';

/** Tempo par défaut quand la dernière sortie n'a pas de BPM renseigné */
const DEFAULT_BPM = 124;

const ROLES = ['DJ', 'Producteur', 'Live act hybride', 'Sound design'];

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  remix: 'Remix',
  live: 'Live',
  djset: 'DJ set',
  video: 'Vidéo',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Europe/Paris',
});

interface HeroSignalProps {
  config: HomepageConfig;
  latest: Track | null;
  nextEvent: Event | null;
}

/**
 * Hero de l'UI v3 : la photo plein cadre en bichromie UV, le nom à la largeur de l'écran
 * qui respire au tempo de la dernière sortie, un oscilloscope qui réagit au pointeur,
 * et la dernière sortie jouable immédiatement.
 */
export default function HeroSignal({ config, latest, nextEvent }: HeroSignalProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const bpm = latest?.bpm && latest.bpm > 40 && latest.bpm < 220 ? latest.bpm : DEFAULT_BPM;
  const beatMs = Math.round(60000 / bpm);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.25]);
  const nameY = useTransform(scrollYProgress, [0, 1], ['0%', '35%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const title = (config.heroTitle || 'LARIAN').toUpperCase();
  const cover = getImageUrl(latest?.imageId);

  const enter = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: easeOutExpo, delay },
        };

  const marqueeItems = [
    ...ROLES.map((role) => <span key={role}>{role}</span>),
    nextEvent ? (
      <span key="next">
        Prochaine date : {nextEvent.title}, {nextEvent.location} ·{' '}
        {dateFormatter.format(new Date(nextEvent.date))}
      </span>
    ) : (
      <span key="booking">Booking ouvert 2026</span>
    ),
    latest ? <span key="latest">Nouveau : {latest.title}</span> : null,
  ].filter(Boolean);

  return (
    <section
      ref={ref}
      aria-label="Larian"
      className="relative isolate -mt-16 flex min-h-svh flex-col overflow-hidden"
      style={{ '--bar': `${beatMs * 4}ms`, '--beat': `${beatMs}ms` } as React.CSSProperties}
    >
      {/* Photo plein cadre, bichromie UV, zoom lent au scroll */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ scale: reduceMotion ? 1.08 : imageScale }}
      >
        <Image
          src="/images/spotify/spotify_banner.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={80}
          className="signal-duotone object-cover object-[50%_30%]"
        />
        <div className="signal-duotone-tint absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,transparent_30%,rgb(5_5_6/0.85)_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgb(5_5_6)] via-[rgb(5_5_6/0.7)] to-transparent" />
      </motion.div>

      {/* Bandeau d'infos façon écran de régie */}
      <motion.div
        {...enter(0.1)}
        className="mx-auto mt-24 flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 font-mono-signal text-[11px] uppercase text-white/70 md:px-8"
      >
        <span className="flex items-center gap-2">
          <span className="signal-pulse inline-block h-2 w-2 bg-[rgb(var(--signal))]" />
          {bpm} BPM{latest?.musicalKey ? ` · ${latest.musicalKey}` : ''}
        </span>
        <span className="hidden sm:inline">Musique électronique · Paris</span>
        <ParisClock />
      </motion.div>

      <div className="flex-1" />

      {/* Le nom, à la largeur de l'écran */}
      <motion.div
        style={{ y: reduceMotion ? 0 : nameY, opacity: fade }}
        className="relative px-2 md:px-4"
      >
        <h1 className="font-poster select-none text-center text-[clamp(4.5rem,21vw,22rem)] text-white">
          <span className="sr-only">{config.heroTitle || 'Larian'}</span>
          <span aria-hidden="true" className="inline-flex">
            {title.split('').map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                className="inline-block overflow-hidden pb-[0.04em]"
                initial={reduceMotion ? false : { y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.1, ease: easeOutExpo, delay: 0.15 + index * 0.06 }}
              >
                <span className="signal-breathe" style={{ '--i': index } as React.CSSProperties}>
                  {letter}
                </span>
              </motion.span>
            ))}
          </span>
        </h1>
      </motion.div>

      {/* Oscilloscope */}
      <SignalWave bpm={bpm} className="pointer-events-none -mt-[4vw] h-[16vh] min-h-24 w-full" />

      {/* Pied du hero : accroche, dernière sortie, actions */}
      <motion.div
        {...enter(0.6)}
        className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-4 pb-6 md:grid-cols-2 md:items-end md:px-8 lg:grid-cols-12 [&>*]:min-w-0"
      >
        <div className="lg:col-span-5">
          <p className="max-w-md text-lg leading-snug text-white/80 md:text-xl">
            {config.heroSubtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={config.heroExploreButtonUrl || '/music'}
              className="group inline-flex h-12 items-center gap-3 bg-[rgb(var(--ink))] px-6 font-mono-signal text-xs font-semibold uppercase text-[rgb(5_5_6)] transition-colors hover:bg-[rgb(var(--signal))]"
            >
              Écouter
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href={config.heroEventsButtonUrl || '/events'}
              className="inline-flex h-12 items-center border border-white/25 px-6 font-mono-signal text-xs uppercase text-white transition-colors hover:border-white"
            >
              Les dates
            </Link>
          </div>
        </div>

        {latest && (
          <Link
            href={`/music?play=${latest.id}`}
            className="group flex items-center gap-4 border border-white/15 bg-[rgb(5_5_6/0.55)] p-3 pr-5 backdrop-blur-md transition-colors hover:border-[rgb(var(--signal))] lg:col-span-4 lg:col-start-9"
          >
            <span className="relative block h-20 w-20 shrink-0 overflow-hidden bg-white/5">
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <PlayGlyph />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-mono-signal text-[11px] uppercase text-[rgb(var(--signal))]">
                <span className="signal-pulse inline-block h-1.5 w-1.5 bg-current" />
                Dernière sortie · {TYPE_LABELS[latest.type] ?? latest.type}
              </span>
              <span className="mt-1 block truncate text-display text-2xl text-white">
                {latest.title}
              </span>
              <span className="mt-1 block font-mono-signal text-[11px] uppercase text-white/60">
                {latest.artist} · {new Date(latest.releaseDate).getFullYear()}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--ink))] text-[rgb(5_5_6)] transition-colors group-hover:bg-[rgb(var(--signal))]"
            >
              <PlayGlyph />
            </span>
          </Link>
        )}
      </motion.div>

      <Marquee
        items={marqueeItems}
        duration={36}
        className="rule-t rule-b bg-[rgb(5_5_6/0.6)] py-3 font-mono-signal text-xs uppercase text-white/80"
      />
    </section>
  );
}

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 translate-x-[1px]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}
