'use client';

import { useEffect, useState } from 'react';

import { cleanupAttributes } from '@/lib/utils/cleanupAttributes';

export default function HydrationWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const cleanup = cleanupAttributes();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
    return () => cleanup?.();
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
