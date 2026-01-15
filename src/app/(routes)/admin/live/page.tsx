'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { AdminLiveDashboard } from './components/AdminLiveDashboard';

export default function AdminLivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Rediriger si l'utilisateur n'est pas admin
  useEffect(() => {
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' && session?.user?.role !== 'ADMIN')
    ) {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-4rem)] text-gray-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] text-gray-100">
      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-white hover:text-gray-300 mb-6"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Retour au tableau de bord
        </Link>
      </div>
      <AdminLiveDashboard />
    </div>
  );
}
