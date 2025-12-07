'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EasterEggMapDialog } from '../profile/components/EasterEggMapDialog';
import { useGameStats } from '@/hooks/useGameStats';

export default function CasinoPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { trackCasinoDiscovery, isAuthenticated } = useGameStats();

  useEffect(() => {
    // Open the dialog immediately on mount
    setIsOpen(true);

    // Track casino discovery for badges
    if (isAuthenticated) {
      trackCasinoDiscovery();
    }
  }, [isAuthenticated, trackCasinoDiscovery]);

  const handleClose = () => {
    setIsOpen(false);
    // Wait for animation to finish then redirect
    setTimeout(() => {
      router.push('/profile');
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
