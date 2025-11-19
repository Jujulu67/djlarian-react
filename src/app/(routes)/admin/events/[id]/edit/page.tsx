'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function EditEventRedirect() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  useEffect(() => {
    logger.debug('Edit redirect - Event ID from params:', eventId);

    // Vérifier que l'ID est valide
    if (!eventId) {
      logger.error('Invalid event ID for edit redirection');
      router.push('/admin/events');
      return;
    }

    // Rediriger vers la page de création d'événement avec l'ID
    const redirectUrl = `/admin/events/new?id=${encodeURIComponent(eventId)}`;
    logger.debug('Redirecting to:', redirectUrl);
    router.push(redirectUrl);
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="w-12 h-12 text-purple-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-semibold text-white">Redirection...</h2>
        <p className="text-gray-400 mt-2">ID: {eventId}</p>
      </div>
    </div>
  );
}
