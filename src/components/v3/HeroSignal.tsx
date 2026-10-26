'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

import { easeOutExpo } from '@/lib/motion';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import type { Track } from '@/lib/utils/types';
import type { HomepageConfig } from '@/types/config';

import ParisClock from './ParisClock';
import SignalWave from './SignalWave';

/** Tempo par défaut quand la dernière sortie n'a pas de BPM renseigné */
const DEFAULT_BPM = 124;

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  remix: 'Remix',
  live: 'Live',
  djset: 'DJ set',
  video: 'Vidéo',
};

interface HeroSignalProps {
  config: HomepageConfig;
  latest: Track | null;
}

/**
 * Hero de l'UI v3 : la photo plein cadre teintée violet, le nom à la largeur de l'écran
 * qui respire au tempo de la dernière sortie, un oscilloscope qui réagit au pointeur,
 * et la dernière sortie jouable dans une carte en verre.
 */
export default function HeroSignal({ config, latest }: HeroSignalProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const bpm = latest?.bpm && latest.bpm > 40 && latest.bpm < 220 ? latest.bpm : DEFAULT_BPM;
  const beatMs = Math.round(60000 / bpm);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
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

  return (
    <section
      ref={ref}
      aria-label="Larian"
      className="relative isolate -mt-20 flex min-h-svh flex-col overflow-hidden"
      style={{ '--bar': `${beatMs * 4}ms`, '--beat': `${beatMs}ms` } as React.CSSProperties}
    >
      {/* Photo plein cadre teintée violet, zoom lent au scroll */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ scale: reduceMotion ? 1.05 : imageScale }}
      >
        <Image
          src="/images/spotify/spotify_banner.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover object-[50%_30%]"
        />
        <div className="signal-duotone-tint absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(7_7_13/0.55)] to-[rgb(7_7_13/0.15)]" />
      </motion.div>

      {/* Bandeau d'infos */}
      <motion.div
        {...enter(0.1)}
        className="mx-auto mt-28 flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 font-mono-signal text-[11px] uppercase text-white/70 md:px-8"
      >
        <span className="flex items-center gap-2">
          <span className="signal-pulse inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--signal))]" />
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
        <h1 className="font-poster select-none text-center text-[clamp(4rem,18vw,19rem)] text-white">
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
      <SignalWave bpm={bpm} className="pointer-events-none -mt-[4vw] h-[14vh] min-h-20 w-full" />

      {/* Pied du hero : accroche, actions, dernière sortie */}
      <motion.div
        {...enter(0.6)}
        className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-4 pb-10 md:grid-cols-2 md:items-end md:px-8 lg:grid-cols-12 [&>*]:min-w-0"
      >
        <div className="lg:col-span-6">
          <p className="max-w-md text-lg leading-snug text-white/85 md:text-xl">
            {config.heroSubtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={config.heroExploreButtonUrl || '/music'}
              className="chrome-pill inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
            >
              <PlayGlyph />
              Écouter
            </Link>
            <Link
              href={config.heroEventsButtonUrl || '/events'}
              className="surface-1 inline-flex h-12 items-center rounded-full px-7 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              Les dates
            </Link>
          </div>
        </div>

        {latest && (
          <Link
            href={`/music?play=${latest.id}`}
            className="surface-2 group flex items-center gap-4 rounded-3xl p-3 pr-4 transition-transform hover:-translate-y-0.5 lg:col-span-5 lg:col-start-8"
          >
            <span className="relative block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl bg-white/5">
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  fill
                  sizes="76px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--signal))]">
                <span className="signal-pulse inline-block h-1.5 w-1.5 rounded-full bg-current" />
                Dernière sortie
              </span>
              <span className="mt-1 block truncate text-display text-xl text-white">
                {latest.title}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-white/70">
                {latest.artist} · {TYPE_LABELS[latest.type] ?? latest.type} ·{' '}
                {new Date(latest.releaseDate).getFullYear()}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--ink))] text-[rgb(7_7_13)] transition-transform group-hover:scale-105"
            >
              <PlayGlyph />
            </span>
          </Link>
        )}
      </motion.div>
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
