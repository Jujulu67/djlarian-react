import type { Metadata } from 'next';

import { normalizePollCode } from '@/lib/polls/rules';

import VotePage from './VotePage';

export const metadata: Metadata = {
  title: 'Vote en live',
  robots: { index: false },
};

export default async function Page({ params }: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return <VotePage code={normalizePollCode(code)} />;
}
