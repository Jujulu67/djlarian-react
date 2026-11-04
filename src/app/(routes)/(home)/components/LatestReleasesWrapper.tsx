import { Suspense } from 'react';

import { getLatestReleases } from '@/lib/data/music';
import LatestReleases from '@/components/sections/LatestReleases';

interface LatestReleasesWrapperProps {
  title: string;
  count: number;
}

async function LatestReleasesContent({ title, count }: LatestReleasesWrapperProps) {
  const releases = await getLatestReleases(count);

  return <LatestReleases title={title} count={count} initialReleases={releases} />;
}

export default function LatestReleasesWrapper(props: LatestReleasesWrapperProps) {
  return (
    <Suspense
      fallback={
        <section className="py-20 bg-gradient-to-b from-black to-purple-900/20 v2:bg-none v2:py-16 md:v2:py-24">
          <div className="max-w-7xl mx-auto px-4 v2:max-w-[1180px]">
            <div className="flex flex-col gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gray-900/40 rounded-lg p-6 h-32 border border-gray-800/40 v2:rounded-2xl v2:border-white/[0.06] v2:bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        </section>
      }
    >
      <LatestReleasesContent {...props} />
    </Suspense>
  );
}
