import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';

import NotificationsClient from './NotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications | DJ Larian',
  description: 'Gérez vos notifications de projets et jalons',
};

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}
    >
      <NotificationsClient />
    </Suspense>
  );
}
