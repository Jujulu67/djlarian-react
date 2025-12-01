'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAdminLivePlayer } from '../hooks/useAdminLivePlayer';

type AdminLivePlayerContextType = ReturnType<typeof useAdminLivePlayer>;

const AdminLivePlayerContext = createContext<AdminLivePlayerContextType | null>(null);

export function AdminLivePlayerProvider({ children }: { children: ReactNode }) {
  const playerState = useAdminLivePlayer();

  return (
    <AdminLivePlayerContext.Provider value={playerState}>
      {children}
    </AdminLivePlayerContext.Provider>
  );
}

export function useAdminLivePlayerContext() {
  const context = useContext(AdminLivePlayerContext);
  if (!context) {
    throw new Error('useAdminLivePlayerContext must be used within AdminLivePlayerProvider');
  }
  return context;
}
