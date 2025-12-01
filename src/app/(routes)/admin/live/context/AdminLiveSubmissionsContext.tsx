'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAdminLiveSubmissions } from '../hooks/useAdminLiveSubmissions';
import type { SubmissionWithUser } from '../hooks/useAdminLiveSubmissions';

type AdminLiveSubmissionsContextType = ReturnType<typeof useAdminLiveSubmissions>;

const AdminLiveSubmissionsContext = createContext<AdminLiveSubmissionsContextType | undefined>(
  undefined
);

export function AdminLiveSubmissionsProvider({ children }: { children: ReactNode }) {
  const submissionsData = useAdminLiveSubmissions();

  return (
    <AdminLiveSubmissionsContext.Provider value={submissionsData}>
      {children}
    </AdminLiveSubmissionsContext.Provider>
  );
}

export function useAdminLiveSubmissionsContext() {
  const context = useContext(AdminLiveSubmissionsContext);
  if (context === undefined) {
    throw new Error(
      'useAdminLiveSubmissionsContext must be used within an AdminLiveSubmissionsProvider'
    );
  }
  return context;
}
