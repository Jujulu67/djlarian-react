import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { getHomepageConfig } from '@/lib/data/homepage';
import HeroSection from './components/HeroSection';
import LatestReleasesWrapper from './components/LatestReleasesWrapper';
import EventsSectionWrapper from './components/EventsSectionWrapper';
import HomePageClient from './components/HomePageClient';
import VisualizerSectionWrapper from './components/VisualizerSectionWrapper';
import ClientUIComponents from './components/ClientUIComponents';

// Lazy load les composants non critiques
const TwitchStream = dynamic(() => import('@/components/sections/TwitchStream'), {
  loading: () => (
    <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700/40 rounded w-1/3 mb-6" />
          <div className="h-64 bg-gray-900/40 rounded-lg" />
        </div>
      </div>
    </section>
  ),
});

export default async function HomePage() {
  // Précharger la configuration côté serveur
  const config = await getHomepageConfig();

  // Définir l'ordre des sections
  const sectionOrder = config.sectionsOrder
    ? config.sectionsOrder.split(',')
    : ['hero', 'releases', 'visualizer', 'events', 'stream'];

  // Fonction pour rendre chaque section
  const renderSection = (sectionType: string, index: number) => {
    switch (sectionType) {
      case 'hero':
        return <HeroSection key="hero" config={config} />;

      case 'releases':
        return config.releasesEnabled ? (
          <Suspense
            key="releases"
            fallback={
              <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex flex-col gap-6 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-900/40 rounded-lg p-6 h-32 border border-gray-800/40"
                      />
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <LatestReleasesWrapper title={config.releasesTitle} count={config.releasesCount} />
          </Suspense>
        ) : null;

      case 'visualizer':
        return config.visualizerEnabled ? (
          <VisualizerSectionWrapper key="visualizer" title={config.visualizerTitle} />
        ) : null;

      case 'events':
        return config.eventsEnabled ? (
          <Suspense
            key="events"
            fallback={
              <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex flex-col gap-6 animate-pulse">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-900/40 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-800/40"
                      >
                        <div className="flex-1 w-full">
                          <div className="h-6 bg-gray-700/40 rounded w-2/3 mb-4" />
                          <div className="h-4 bg-gray-700/30 rounded w-1/3 mb-2" />
                          <div className="h-4 bg-gray-700/30 rounded w-1/2" />
                        </div>
                        <div className="h-10 w-32 bg-purple-700/30 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <EventsSectionWrapper title={config.eventsTitle} count={config.eventsCount} />
          </Suspense>
        ) : null;

      case 'stream':
        return config.streamEnabled ? (
          <Suspense
            key="stream"
            fallback={
              <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-700/40 rounded w-1/3 mb-6" />
                    <div className="h-64 bg-gray-900/40 rounded-lg" />
                  </div>
                </div>
              </section>
            }
          >
            <TwitchStream />
          </Suspense>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <HomePageClient />
      <ClientUIComponents />
      <div className="scroll-snap-container" style={{ position: 'relative' }}>
        {sectionOrder.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
