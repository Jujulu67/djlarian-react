import type { Metadata } from 'next';

import { normalizePollCode } from '@/lib/polls/rules';

import OverlayView from './OverlayView';

export const metadata: Metadata = {
  title: 'Overlay du vote',
  robots: { index: false },
};

/** Source navigateur pour OBS : rien d'autre que la carte du vote, fond transparent. */
export default async function Page({ params }: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return <OverlayView code={normalizePollCode(code)} />;
}
