'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EasterEggMapDialog } from '../profile/components/EasterEggMapDialog';
import { useGameStats } from '@/hooks/useGameStats';
import { useIsClient } from '@/hooks/useIsClient';

export default function CasinoPage() {
  const router = useRouter();
  // Le dialogue s'ouvre dès l'arrivée côté client
  const isClient = useIsClient();
  const [closed, setClosed] = useState(false);
  const isOpen = isClient && !closed;
  const { trackCasinoDiscovery, isAuthenticated } = useGameStats();

  useEffect(() => {
    // Track casino discovery for badges
    if (isAuthenticated) {
      trackCasinoDiscovery();
    }
  }, [isAuthenticated, trackCasinoDiscovery]);

  const handleClose = () => {
    setClosed(true);
    // Wait for animation to finish then redirect
    setTimeout(() => {
      // Un visiteur n'a pas de profil : le renvoyer à l'accueil
      router.push(isAuthenticated ? '/profile' : '/');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Minimal background while dialog loads */}
      <div className="animate-pulse text-purple-500 font-audiowide">Chargement du Casino...</div>

      <EasterEggMapDialog isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}
