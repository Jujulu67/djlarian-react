import type { Metadata } from 'next';

import ManagePoll from './ManagePoll';

export const metadata: Metadata = {
  title: 'Piloter le vote',
  robots: { index: false },
};

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <ManagePoll id={id} />
    </div>
  );
}
