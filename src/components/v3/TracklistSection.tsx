'use client';

import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { PointerEvent } from 'react';

import { easeOutExpo } from '@/lib/motion';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import type { Track } from '@/lib/utils/types';

import SectionIndex from './SectionIndex';

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  remix: 'Remix',
  live: 'Live',
  djset: 'DJ set',
  video: 'Vidéo',
};

/**
 * Sorties en tracklist : une ligne par morceau (index, titre, type, BPM, tonalité, année).
 * Sur desktop, la pochette suit le curseur au survol ; un clic lance la lecture sur /music.
 */
export default function TracklistSection({
  tracks,
  index = '01',
}: {
  tracks: Track[];
  index?: string;
}) {
  const [hovered, setHovered] = useState<Track | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 300, damping: 30, mass: 0.6 });

  if (tracks.length === 0) return null;

  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const hoveredCover = getImageUrl(hovered?.imageId);

  return (
    <section className="relative mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-32">
      <SectionIndex index={index} label="Sorties" href="/music" linkLabel="Toute la discographie" />

      <ol
        className="relative mt-10 rule-t"
        onPointerMove={handleMove}
        onPointerLeave={() => setHovered(null)}
      >
        {tracks.map((track, position) => (
          <li key={track.id} className="rule-b">
            <Link
              href={`/music?play=${track.id}`}
              onPointerEnter={() => setHovered(track)}
              onFocus={() => setHovered(track)}
              onBlur={() => setHovered(null)}
              className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-5 transition-colors md:grid-cols-[4rem_1fr_8rem_6rem_6rem_4rem] md:py-7"
            >
              <span className="font-mono-signal text-xs text-white/50 transition-colors group-hover:text-white">
                {String(position + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-display text-3xl text-white transition-[font-variation-settings,letter-spacing] duration-500 [font-variation-settings:'wdth'_100] group-hover:[font-variation-settings:'wdth'_125] md:text-4xl lg:text-6xl">
                  {track.title}
                </span>
                <span className="mt-1 block font-mono-signal text-[11px] uppercase text-white/50 md:hidden">
                  {TYPE_LABELS[track.type] ?? track.type}
                  {track.bpm ? ` · ${track.bpm} BPM` : ''}
                </span>
              </span>
              <span className="hidden font-mono-signal text-xs uppercase text-white/60 md:block">
                {TYPE_LABELS[track.type] ?? track.type}
              </span>
              <span className="hidden font-mono-signal text-xs text-white/60 md:block">
                {track.bpm ? `${track.bpm} BPM` : '— BPM'}
              </span>
              <span className="hidden font-mono-signal text-xs text-white/60 md:block">
                {track.musicalKey || '—'}
              </span>
              <span className="flex items-center justify-end gap-3 font-mono-signal text-xs text-white/60">
                <span className="hidden md:inline">
                  {new Date(track.releaseDate).getFullYear()}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition-all group-hover:border-[rgb(var(--signal))] group-hover:bg-[rgb(var(--signal))] group-hover:text-[rgb(5_5_6)]"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3 translate-x-[1px]"
                    fill="currentColor"
                  >
                    <path d="M4 2.5v11l9-5.5z" />
                  </svg>
                </span>
              </span>
            </Link>
          </li>
        ))}

        {/* Pochette qui suit le curseur (desktop, pointeur fin uniquement) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-10 hidden [@media(hover:hover)]:md:block"
          style={{ x: springX, y: springY }}
        >
          <AnimatePresence>
            {hovered && hoveredCover && (
              <motion.div
                key={hovered.id}
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: easeOutExpo }}
                className="relative -translate-x-1/2 -translate-y-[110%] overflow-hidden shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
                style={{ width: 240, height: 240 }}
              >
                <Image src={hoveredCover} alt="" fill sizes="240px" className="object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </ol>
    </section>
  );
}
