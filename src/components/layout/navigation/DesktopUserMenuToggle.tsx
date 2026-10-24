'use client';

import { getAvatarSrc } from './navigationUtils';

import type { Session } from 'next-auth';
import { User } from 'lucide-react';
import Image from 'next/image';
import type { Dispatch, SetStateAction } from 'react';

interface DesktopUserMenuToggleProps {
  isUserMenuOpen: boolean;
  session: Session;
  setIsUserMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function DesktopUserMenuToggle({
  isUserMenuOpen,
  session,
  setIsUserMenuOpen,
}: DesktopUserMenuToggleProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsUserMenuOpen(!isUserMenuOpen);
      }}
      className={`flex items-center text-white/90 hover:text-white transition-all duration-300
      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
      rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105
      ${session.user?.image ? 'space-x-2 px-2 py-1' : 'space-x-3 px-4 py-2'}`}
    >
      {session.user?.image ? (
        <div className="relative w-11 h-11 rounded-full overflow-hidden">
          <Image
            src={getAvatarSrc(session.user.image)}
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
      <span>{session.user?.name || 'Utilisateur'}</span>
    </button>
  );
}
