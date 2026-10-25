import HeroSignal from '@/components/v3/HeroSignal';
import TourSection from '@/components/v3/TourSection';
import TracklistSection from '@/components/v3/TracklistSection';
import { getUpcomingEvents } from '@/lib/data/events';
import { getLatestReleases } from '@/lib/data/music';
import type { HomepageConfig } from '@/types/config';

/**
 * Hero et sections « Sorties » / « Dates » de l'accueil en UI v3, rendus côté serveur.
 * La dernière sortie donne son tempo au hero.
 */
export async function HeroV3({ config }: { config: HomepageConfig }) {
  const [releases, events] = await Promise.all([getLatestReleases(1), getUpcomingEvents(1)]);
  return <HeroSignal config={config} latest={releases[0] ?? null} nextEvent={events[0] ?? null} />;
}

export async function ReleasesV3({ count, index }: { count: number; index: string }) {
  // Une tracklist se lit mieux avec un peu plus de lignes que la grille v2
  const releases = await getLatestReleases(Math.max(count, 5));
  return <TracklistSection tracks={releases} index={index} />;
}

export async function EventsV3({ count, index }: { count: number; index: string }) {
  const events = await getUpcomingEvents(Math.max(count, 4));
  return <TourSection events={events} index={index} />;
}
