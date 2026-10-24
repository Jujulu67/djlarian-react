'use client';

import { hasArcadeAccess } from './navigationUtils';

import type { Session } from 'next-auth';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderKanban, Gamepad2, KeyRound, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

interface MobileUserDropdownProps {
  handleSignOut: () => void;
  isMobileUserMenuOpen: boolean;
  session: Session;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileUserMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function MobileUserDropdown({
  handleSignOut,
  isMobileUserMenuOpen,
  session,
  setIsMobileMenuOpen,
  setIsMobileUserMenuOpen,
}: MobileUserDropdownProps) {
  return (
    <AnimatePresence>
      {isMobileUserMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5, scale: 0.98 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              type: 'spring',
              damping: 25,
              stiffness: 400,
              duration: 0.2,
            },
          }}
          exit={{
            opacity: 0,
            y: -5,
            scale: 0.98,
            transition: {
              duration: 0.15,
            },
          }}
          className="absolute right-0 mt-2 w-48 rounded-lg bg-black/95 backdrop-blur-lg border border-purple-500/20 shadow-lg shadow-purple-500/5"
          style={{ padding: '0.25rem' }}
        >
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-white border-b border-purple-500/20 mb-1">
              {session.user?.name || 'Utilisateur'}
            </div>
            {session.user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="navMenuItem navMenuItemDanger"
                onClick={() => {
                  setIsMobileUserMenuOpen(false);
                  // Fermer aussi le menu burger si ouvert
                  setIsMobileMenuOpen(false);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Panel Admin
              </Link>
            )}
            <Link
              href="/profile"
              className="navMenuItem"
              onClick={() => setIsMobileUserMenuOpen(false)}
            >
              <User className="w-4 h-4 mr-2" />
              Profil
            </Link>
            <Link
              href="/projects"
              className="navMenuItem navMenuItemAccent"
              onClick={() => {
                setIsMobileUserMenuOpen(false);
                setIsMobileMenuOpen(false);
              }}
            >
              <FolderKanban className="w-4 h-4 mr-2" />
              Mes Projets
            </Link>

            <Link
              href="/licenses"
              className="navMenuItem navMenuItemSuccess"
              onClick={() => {
                setIsMobileUserMenuOpen(false);
                setIsMobileMenuOpen(false);
              }}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Mes Licences
            </Link>

            {/* Jeu / Arcade Link - Conditional Mobile */}
            {hasArcadeAccess(session.user) ? (
              <Link
                href="/games"
                className="navMenuItem navMenuItemWarning"
                onClick={() => {
                  setIsMobileUserMenuOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Arcade
              </Link>
            ) : null}

            <button
              onClick={async () => {
                await handleSignOut();
                setIsMobileUserMenuOpen(false);
              }}
              className="navMenuItem navMenuItemDanger w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
