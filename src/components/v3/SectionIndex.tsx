import Link from 'next/link';

interface SectionIndexProps {
  index: string;
  label: string;
  href?: string;
  linkLabel?: string;
}

/** En-tête de section v3 : numéro de piste, titre très large, lien à droite */
export default function SectionIndex({ index, label, href, linkLabel }: SectionIndexProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <h2 className="flex items-start gap-4 text-display text-[clamp(2.5rem,6vw,5.5rem)] text-white">
        <span className="mt-[0.35em] font-mono-signal text-xs font-normal normal-case tracking-normal text-white/50">
          [{index}]
        </span>
        {label}
      </h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="group mb-3 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
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
