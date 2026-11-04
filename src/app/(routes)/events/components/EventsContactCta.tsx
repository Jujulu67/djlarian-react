'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { useUiVersion } from '@/hooks/useUiVersion';

/** Encart « Vous organisez un événement ? » en bas de la liste */
export function EventsContactCta() {
  const isV2 = useUiVersion() === 'v2';

  if (isV2) {
    return (
      <Reveal className="mt-20 md:mt-28">
        <div className="flex flex-col items-start gap-6 rounded-[2rem] p-8 surface-1 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Booking
            </p>
            <h2 className="text-display text-2xl text-white md:text-3xl">
              Vous organisez un événement ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60 md:text-base">
              DJ Larian est disponible pour animer vos soirées, clubs et festivals. Parlons de votre
              projet.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/contact">
              Nous contacter
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="mt-16 py-10 px-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-md rounded-2xl border border-purple-500/20 text-center shadow-xl">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
        Vous organisez un événement ?
      </h2>
      <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
        DJ Larian est disponible pour animer vos soirées, clubs et festivals. Contactez-nous pour
        discuter de votre projet et obtenir un devis personnalisé.
      </p>
      <a
        href="/contact"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-700/30 hover:shadow-purple-700/50 transform hover:-translate-y-1"
      >
        Nous contacter
        <ChevronDown className="w-5 h-5 transform -rotate-90" />
      </a>
    </div>
  );
}
