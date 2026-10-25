'use client';

import { Loader2, Music, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useUiVersion } from '@/hooks/useUiVersion';

import { MusicHeader } from './MusicHeader';
import { StatePanel } from './StatePanel';

/** Conteneur de page : dégradé legacy, transparent en v2 (fond ambiant visible) */
export const MUSIC_PAGE_CLASS =
  'min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-900 to-black p-8 pt-28 pb-20 v2:bg-none v2:bg-transparent v2:px-4 v2:pb-24 v2:pt-28 sm:v2:px-6 md:v2:pt-36';
export const MUSIC_CONTAINER_CLASS = 'container mx-auto max-w-6xl v2:max-w-[1180px] v2:px-0';

/**
 * Chargement. Rendu au premier affichage (donc à l'hydratation) : les deux versions
 * sont dans le DOM et c'est le CSS (`v2:`) qui choisit, pour éviter tout écart serveur/client.
 */
export function MusicLoadingState() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 v2:hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-16 h-16 text-purple-500 mb-4 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-white mt-4">
                Chargement de la musique...
              </h2>
              <p className="text-gray-400 mt-2">Préparez-vous à découvrir mes morceaux</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`hidden v2:block ${MUSIC_PAGE_CLASS}`}>
        <div className={MUSIC_CONTAINER_CLASS} role="status">
          <span className="sr-only">Chargement de la musique...</span>
          <MusicHeader />
          <div className="mb-10 flex flex-col gap-4 md:mb-12" aria-hidden="true">
            <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="flex gap-2 overflow-hidden">
              {[64, 72, 104, 80, 80, 56].map((width, i) => (
                <div
                  key={i}
                  className="h-9 shrink-0 animate-pulse rounded-full bg-white/[0.04]"
                  style={{ width }}
                />
              ))}
            </div>
          </div>
          <div
            className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-2xl p-3 surface-1">
                <div className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
                <div className="px-1.5 pb-1 pt-4">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function MusicErrorState({ error }: { error: string }) {
  const isV2 = useUiVersion() === 'v2';

  if (isV2) {
    return (
      <div className={MUSIC_PAGE_CLASS}>
        <div className={MUSIC_CONTAINER_CLASS}>
          <MusicHeader />
          <StatePanel
            icon={XCircle}
            tone="error"
            title="Une erreur est survenue"
            description={error}
            action={<Button onClick={() => window.location.reload()}>Réessayer</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="bg-gray-800/40 backdrop-blur-sm border border-red-500/30 p-8 rounded-xl text-center max-w-lg shadow-xl">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Une erreur est survenue</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MusicEmptyStateProps {
  searchTerm: string;
  typeLabel?: string;
  onClearSearch: () => void;
}

export function MusicEmptyState({ searchTerm, typeLabel, onClearSearch }: MusicEmptyStateProps) {
  const isV2 = useUiVersion() === 'v2';

  if (isV2) {
    return (
      <StatePanel
        icon={Music}
        title="Aucun morceau trouvé"
        description={
          searchTerm
            ? `Aucun résultat pour « ${searchTerm} ».`
            : typeLabel
              ? `Aucun morceau dans « ${typeLabel} » pour le moment.`
              : 'Aucun morceau disponible pour le moment.'
        }
        action={
          searchTerm ? (
            <Button variant="outline" onClick={onClearSearch}>
              Effacer la recherche
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-10 border border-gray-700/50 text-center shadow-xl">
      <div className="w-24 h-24 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-6">
        <Music className="w-12 h-12 text-gray-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Aucun morceau trouvé</h2>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        {searchTerm
          ? `Aucun résultat ne correspond à "${searchTerm}"`
          : !typeLabel
            ? 'Aucun morceau disponible pour le moment'
            : `Aucun morceau de type "${typeLabel}"`}
      </p>
      {searchTerm && (
        <button
          onClick={onClearSearch}
          className="px-6 py-2.5 bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors inline-flex items-center gap-2"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );
}
