'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useLiveInventory } from '../hooks/useLiveInventory';
import type { LiveInventory, UpdateInventoryInput } from '@/types/live';

type LiveInventoryContextType = ReturnType<typeof useLiveInventory>;

const LiveInventoryContext = createContext<LiveInventoryContextType | null>(null);

export function LiveInventoryProvider({ children }: { children: ReactNode }) {
  const inventoryState = useLiveInventory();

  return (
    <LiveInventoryContext.Provider value={inventoryState}>{children}</LiveInventoryContext.Provider>
  );
}

export function useLiveInventoryContext() {
  const context = useContext(LiveInventoryContext);
  if (!context) {
    throw new Error('useLiveInventoryContext must be used within LiveInventoryProvider');
  }
  return context;
}
