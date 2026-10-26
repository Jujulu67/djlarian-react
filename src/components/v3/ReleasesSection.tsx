import { Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import type { Track } from '@/lib/utils/types';

import SectionIndex from './SectionIndex';

/**
 * Sorties de l'accueil v3 : cartes en verre avec la pochette en grand,
 * artistes et métadonnées (BPM, tonalité, année). Un clic lance la lecture sur /music.
 */
export default function ReleasesSection({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-[1440px] px-4 py-20 md:px-8 md:py-28">
      <SectionIndex
        eyebrow="Discographie"
        label="Sorties"
        href="/music"
        linkLabel="Toute la discographie"
      />

      <ul className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tracks.map((track) => {
          const cover = getImageUrl(track.imageId);
          const meta = [
            track.bpm ? `${track.bpm} BPM` : null,
            track.musicalKey || null,
            new Date(track.releaseDate).getFullYear(),
          ].filter(Boolean);

          return (
            <li key={track.id}>
              <Link
                href={`/music?play=${track.id}`}
                className="surface-1 group block rounded-[1.6rem] p-3 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <span className="relative block aspect-square overflow-hidden rounded-[1.1rem] bg-white/[0.04]">
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <Music className="h-10 w-10 text-white/20" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="mx-1.5 mb-1.5 mt-4 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-display text-lg text-white">
                      {track.title}
                    </span>
                    <span className="mt-1 block truncate text-[13px] text-white/70">
                      {track.artist}
                    </span>
                    <span className="mt-1 block font-mono-signal text-[11px] uppercase text-white/50">
                      {meta.join(' · ')}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-colors group-hover:border-transparent group-hover:bg-[rgb(var(--ink))] group-hover:text-[rgb(7_7_13)]"
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
          );
        })}
      </ul>
    </section>
  );
}
