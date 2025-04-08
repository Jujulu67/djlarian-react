'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function EditEventRedirect() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  useEffect(() => {
    // Rediriger vers la page de création d'événement avec l'ID
    router.push(`/admin/events/new?id=${eventId}`);
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="w-12 h-12 text-purple-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-semibold text-white">Redirection...</h2>
      </div>
    </div>
  );
}
