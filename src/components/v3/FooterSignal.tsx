'use client';

import Link from 'next/link';

import { getNavLinks } from '@/components/layout/navigation/navigationConfig';
import { socialLinks } from '@/config/socialLinks';

import ParisClock from './ParisClock';

/** Footer de l'UI v3 : un grand panneau de verre orienté booking, liens et réseaux en pilules */
export default function FooterSignal() {
  const links = getNavLinks(false, false).filter((link) => link.href !== '/');
  const year = new Date().getFullYear();

  return (
    <footer className="relative mx-auto mt-24 max-w-[1440px] px-4 pb-8 md:px-8">
      <div className="surface-1 rounded-[2rem] p-8 md:p-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--ice))]">
              Booking
            </p>
            <a
              href="mailto:booking@larian.com"
              className="chrome-text mt-3 block break-all text-display text-3xl md:text-5xl"
            >
              booking@larian.com
            </a>
            <p className="mt-3 text-white/70">
              Clubs, festivals, lives hybrides. Réponse sous 48 h.
            </p>
          </div>

          <ul className="flex flex-wrap gap-2.5" aria-label="Réseaux">
            {socialLinks.map((social) => (
              <li key={social.name}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-1 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-white transition-colors hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4"
                >
                  {social.icon}
                  {social.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav
          aria-label="Pied de page"
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/70 transition-colors hover:text-white"
            >
              {link.labelFr ?? link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-2 text-[13px] text-white/50">
        <span>© {year} Larian</span>
        <ParisClock className="font-mono-signal text-[11px] uppercase" />
        <Link href="/licenses" className="transition-colors hover:text-white">
          Licences
        </Link>
      </div>
    </footer>
  );
}
