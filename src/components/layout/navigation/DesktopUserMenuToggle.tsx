'use client';

import { getDesktopAvatarSrc } from './navigationUtils';

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
      v2:bg-none v2:bg-white/[0.04] v2:hover:bg-white/[0.08] v2:border-white/10 v2:hover:border-white/20 v2:hover:scale-100 v2:active:scale-[0.98]
      ${session.user?.image ? 'space-x-2 px-2 py-1' : 'space-x-3 px-4 py-2'}`}
    >
      {session.user?.image ? (
        <div className="relative w-11 h-11 rounded-full overflow-hidden v2:ring-1 v2:ring-white/15">
          <Image
            src={getDesktopAvatarSrc(session.user.image)}
            alt={session.user.name || 'Avatar'}
            fill
            className="object-cover"
            unoptimized
            key={session.user.image} // Force le re-render quand l'image change
          />
        </div>
      ) : (
        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500/50 v2:border-0 v2:ring-1 v2:ring-white/15">
          <User className="w-full h-full p-1.5" />
        </div>
      )}
      <span>{session.user?.name || 'Utilisateur'}</span>
    </button>
  );
}
