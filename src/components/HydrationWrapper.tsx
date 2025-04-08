'use client';

import { useEffect, useState } from 'react';
import { cleanupAttributes } from '@/utils/cleanupAttributes';

export default function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const cleanup = cleanupAttributes();
    setHasMounted(true);
    return () => cleanup?.();
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
