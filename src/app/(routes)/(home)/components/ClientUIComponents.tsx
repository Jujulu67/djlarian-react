'use client';

import dynamic from 'next/dynamic';

// Composants UI qui doivent être chargés côté client uniquement
const ScrollProgress = dynamic(() => import('@/components/ui/ScrollProgress'), {
  ssr: false,
});

const ScrollToTop = dynamic(() => import('@/components/ui/ScrollToTop'), {
  ssr: false,
});

export default function ClientUIComponents() {
  return (
    <>
      <ScrollProgress />
      <ScrollToTop />
    </>
  );
}
