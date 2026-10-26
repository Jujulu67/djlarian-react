import Link from 'next/link';

interface SectionIndexProps {
  eyebrow: string;
  label: string;
  href?: string;
  linkLabel?: string;
}

/** En-tête de section de l'accueil v3 : surtitre, titre chromé, lien en pilule de verre */
export default function SectionIndex({ eyebrow, label, href, linkLabel }: SectionIndexProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--ice))]">
          {eyebrow}
        </p>
        <h2 className="chrome-text text-display text-4xl md:text-5xl">{label}</h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="surface-1 group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          {linkLabel}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
