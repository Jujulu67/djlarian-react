import { Suspense } from 'react';

import { getUpcomingEvents } from '@/lib/data/events';
import UpcomingEvents from '@/components/sections/UpcomingEvents';

interface EventsSectionWrapperProps {
  title: string;
  count: number;
}

async function EventsSectionContent({ title, count }: EventsSectionWrapperProps) {
  const events = await getUpcomingEvents(count);

  return <UpcomingEvents events={events} title={title} count={count} />;
}

export default function EventsSectionWrapper(props: EventsSectionWrapperProps) {
  return (
    <Suspense
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
      <EventsSectionContent {...props} />
    </Suspense>
  );
}
