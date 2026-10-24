'use client';

import type { Session } from 'next-auth';
import { User } from 'lucide-react';
import Image from 'next/image';
import type { Dispatch, SetStateAction } from 'react';

interface MobileUserMenuToggleProps {
  isMobileUserMenuOpen: boolean;
  session: Session;
  setIsMobileUserMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function MobileUserMenuToggle({
  isMobileUserMenuOpen,
  session,
  setIsMobileUserMenuOpen,
}: MobileUserMenuToggleProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsMobileUserMenuOpen(!isMobileUserMenuOpen);
      }}
      className="mobile-user-button flex items-center justify-center text-white/90 hover:text-white 
        bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
        w-10 h-10 rounded-full border border-purple-500/20 hover:border-purple-500/40"
      aria-label="Menu utilisateur"
    >
      {session.user?.image ? (
        <div className="relative w-10 h-10 rounded-full overflow-hidden">
          <Image
            src={session.user.image}
            alt={session.user.name || 'Avatar'}
            fill
            className="object-cover"
            unoptimized
            key={session.user.image} // Force le re-render quand l'image change
          />
        </div>
      ) : (
        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500/50">
          <User className="w-full h-full p-1.5" />
        </div>
      )}
    </button>
  );
}
