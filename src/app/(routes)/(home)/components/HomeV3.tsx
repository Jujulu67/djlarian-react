import DatesSection from '@/components/v3/DatesSection';
import HeroSignal from '@/components/v3/HeroSignal';
import ReleasesSection from '@/components/v3/ReleasesSection';
import { getUpcomingEvents } from '@/lib/data/events';
import { getLatestReleases } from '@/lib/data/music';
import type { HomepageConfig } from '@/types/config';

/**
 * Hero et sections « Sorties » / « Dates » de l'accueil en UI v3, rendus côté serveur.
 * La dernière sortie donne son tempo au hero.
 */
export async function HeroV3({ config }: { config: HomepageConfig }) {
  const releases = await getLatestReleases(1);
  return <HeroSignal config={config} latest={releases[0] ?? null} />;
}

export async function ReleasesV3({ count }: { count: number }) {
  // Grille de 4 cartes sur desktop : on complète jusqu'à 4
  const releases = await getLatestReleases(Math.max(count, 4));
  return <ReleasesSection tracks={releases} />;
}

export async function EventsV3({ count }: { count: number }) {
  const events = await getUpcomingEvents(Math.max(count, 3));
  return <DatesSection events={events} />;
}
