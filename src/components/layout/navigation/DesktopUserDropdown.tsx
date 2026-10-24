'use client';

import { hasArcadeAccess } from './navigationUtils';

import type { Session } from 'next-auth';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderKanban, Gamepad2, KeyRound, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

interface DesktopUserDropdownProps {
  handleSignOut: () => void;
  isUserMenuOpen: boolean;
  session: Session;
}

export function DesktopUserDropdown({
  handleSignOut,
  isUserMenuOpen,
  session,
}: DesktopUserDropdownProps) {
  return (
    <AnimatePresence>
      {isUserMenuOpen && (
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
          <motion.div
            className="py-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            {session.user?.role === 'ADMIN' && (
              <motion.div
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.1 }}
              >
                <Link href="/admin" className="navMenuItem navMenuItemDanger">
                  <Settings className="w-4 h-4 mr-2" />
                  Panel Admin
                </Link>
              </motion.div>
            )}
            <motion.div
              initial={{ x: -5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.1 }}
            >
              <Link href="/profile" className="navMenuItem">
                <User className="w-4 h-4 mr-2" />
                Profil
              </Link>
            </motion.div>
            <motion.div
              initial={{ x: -5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.1 }}
            >
              <Link href="/projects" className="navMenuItem navMenuItemAccent">
                <FolderKanban className="w-4 h-4 mr-2" />
                Mes Projets
              </Link>
            </motion.div>

            <motion.div
              initial={{ x: -5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.14, duration: 0.1 }}
            >
              <Link href="/licenses" className="navMenuItem navMenuItemSuccess">
                <KeyRound className="w-4 h-4 mr-2" />
                Mes Licences
              </Link>
            </motion.div>

            {/* Jeu / Arcade Link - Conditional */}
            {hasArcadeAccess(session.user) ? (
              <motion.div
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.1 }}
              >
                <Link href="/games" className="navMenuItem navMenuItemWarning">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Arcade
                </Link>
              </motion.div>
            ) : null}

            <motion.div
              initial={{ x: -5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.17, duration: 0.1 }}
            >
              <button onClick={handleSignOut} className="navMenuItem navMenuItemDanger w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
