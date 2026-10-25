'use client';

import Link from 'next/link';

import { getNavLinks } from '@/components/layout/navigation/navigationConfig';
import { socialLinks } from '@/config/socialLinks';

import ParisClock from './ParisClock';

/** Footer de l'UI v3 : appel au booking, liens, et le nom en très grand qui ferme la page */
export default function FooterSignal() {
  const links = getNavLinks(false, false).filter((link) => link.href !== '/');
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-32 overflow-hidden rule-t">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 pt-16 md:grid-cols-12 md:px-8">
        <div className="md:col-span-6">
          <p className="font-mono-signal text-xs uppercase text-white/50">[ Booking ]</p>
          <a
            href="mailto:booking@larian.com"
            className="group mt-4 inline-block text-display text-4xl text-white md:text-6xl"
          >
            Réserver
            <br />
            un set
            <span
              aria-hidden="true"
              className="ml-3 inline-block text-[rgb(var(--signal))] transition-transform duration-300 group-hover:translate-x-2"
            >
              →
            </span>
          </a>
          <p className="mt-6 max-w-sm text-white/60">
            Clubs, festivals, lives hybrides. Écris à booking@larian.com, réponse sous 48 h.
          </p>
        </div>

        <nav aria-label="Pied de page" className="md:col-span-3">
          <p className="font-mono-signal text-xs uppercase text-white/50">[ Index ]</p>
          <ul className="mt-4 space-y-2">
            {links.map((link, index) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex items-baseline gap-3 text-lg text-white/80 transition-colors hover:text-white"
                >
                  <span className="font-mono-signal text-xs text-white/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    {link.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="font-mono-signal text-xs uppercase text-white/50">[ Réseaux ]</p>
          <ul className="mt-4 space-y-2">
            {socialLinks.map((social) => (
              <li key={social.name}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-lg text-white/80 transition-colors hover:text-white [&_svg]:h-4 [&_svg]:w-4"
                >
                  {social.icon}
                  {social.name}
                  <span aria-hidden="true" className="text-white/40">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 font-mono-signal text-[11px] uppercase text-white/50 md:px-8">
        <span>© {year} Larian</span>
        <ParisClock />
        <Link href="/licenses" className="transition-colors hover:text-white">
          Licences
        </Link>
      </div>

      {/* Le nom, à la largeur de l'écran, coupé par le bas de la page */}
      <p
        aria-hidden="true"
        className="font-poster pointer-events-none mt-6 select-none whitespace-nowrap text-center text-[23.5vw] text-white/[0.06]"
        style={{ marginBottom: '-0.18em' }}
      >
        LARIAN
      </p>
    </footer>
  );
}
