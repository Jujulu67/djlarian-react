'use client';

import Link from 'next/link';

import { socialLinks } from '@/config/socialLinks';

import { getNavLinks } from './navigation/navigationConfig';

/** Footer global de l'UI v2 */
export default function Footer() {
  const links = getNavLinks(false, false).filter((link) => link.href !== '/');
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 px-3 pb-6">
      <div className="surface-1 mx-auto w-[min(1180px,100%)] rounded-[2rem] px-6 py-10 md:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="text-display text-2xl text-white">
              LARIAN
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Producteur de musique électronique et performer. Sorties, dates et lives, au même
              endroit.
            </p>
          </div>

          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/60 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:text-white [&_svg]:h-4 [&_svg]:w-4"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-white/40 md:flex-row md:justify-between">
          <p>© {year} Larian. Tous droits réservés.</p>
          <Link href="/licenses" className="transition-colors hover:text-white/70">
            Licences
          </Link>
        </div>
      </div>
    </footer>
  );
}
