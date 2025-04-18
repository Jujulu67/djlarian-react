'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import AuthModal from '../auth/AuthModal';
import { Menu, User, LogOut, Music, Calendar, ImageIcon, Mail, Settings, Home } from 'lucide-react';
import Image from 'next/image';

const Navigation = () => {
  const { data: session, status } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Debug: Afficher les informations de session
  useEffect(() => {
    if (session) {
      console.log('Session:', session);
      console.log('User role:', session?.user?.role);
    }
  }, [session]);

  useEffect(() => {
    setMounted(true);
    let timeout: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsScrolled(window.scrollY > 10);
      }, 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/oldHome', label: 'Old Home', icon: Home },
    { href: '/music', label: 'Music', icon: Music },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/contact', label: 'Contact', icon: Mail },
  ];

  // Fermer les menus quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isUserMenuOpen && !target.closest('.user-menu')) {
        setIsUserMenuOpen(false);
      }
      if (
        isMobileMenuOpen &&
        !target.closest('.mobile-menu') &&
        !target.closest('.mobile-menu-button')
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        isMobileUserMenuOpen &&
        !target.closest('.mobile-user-menu') &&
        !target.closest('.mobile-user-button')
      ) {
        setIsMobileUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen, isMobileMenuOpen, isMobileUserMenuOpen]);

  if (!mounted) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors transition-[border-opacity] duration-300 ${
          isScrolled
            ? 'bg-black/95 backdrop-blur-lg border-b border-purple-500/10 border-opacity-100 shadow-lg shadow-purple-500/5'
            : 'bg-gradient-to-b from-black/80 to-transparent border-b border-purple-500/10 border-opacity-0 shadow-none'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />

        <nav className="container mx-auto px-4 h-16 flex items-center justify-between relative z-10">
          <Link
            href="/"
            className="text-2xl font-audiowide text-white hover:text-purple-400 transition-colors duration-300"
          >
            LARIAN
          </Link>

          {/* Version desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2 hover:scale-105 group"
              >
                {link.icon && (
                  <link.icon
                    size={18}
                    className="group-hover:text-purple-400 transition-colors duration-300"
                  />
                )}
                {link.label}
              </Link>
            ))}

            {/* Logique d'affichage conditionnel basée sur le statut de la session */}
            <AnimatePresence mode="wait">
              {status === 'loading' ? (
                // Placeholder pendant le chargement
                <motion.div
                  key="loading"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-[120px] h-[40px] animate-pulse bg-gray-800/50 rounded-full"
                />
              ) : session ? (
                <motion.div
                  key="user-profile"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                  className="relative user-menu"
                >
                  {/* Debug: Afficher le rôle */}
                  <div className="absolute -top-6 left-0 text-xs text-purple-400">
                    Role: {session?.user?.role || 'none'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen(!isUserMenuOpen);
                    }}
                    className="flex items-center space-x-3 text-gray-300 hover:text-white transition-all duration-300
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      px-4 py-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || 'Avatar'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-1" />
                      )}
                    </div>
                    <span>{session.user?.name || 'Utilisateur'}</span>
                  </button>

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
                        className="absolute right-0 mt-2 w-48 rounded-lg bg-black/95 backdrop-blur-lg border border-purple-500/20 shadow-lg shadow-purple-500/5 overflow-hidden"
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
                              <Link
                                href="/admin"
                                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                              >
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
                            <Link
                              href="/profile"
                              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                            >
                              <User className="w-4 h-4 mr-2" />
                              Profil
                            </Link>
                          </motion.div>
                          <motion.div
                            initial={{ x: -5, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.15, duration: 0.1 }}
                          >
                            <button
                              onClick={() => signOut()}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Déconnexion
                            </button>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="login-button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <button
                    onClick={() => {
                      // Ouvrir le modal immédiatement
                      setIsAuthModalOpen(true);
                    }}
                    className="text-gray-300 hover:text-white transition-all duration-300
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      px-4 py-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
                  >
                    Connexion
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Version mobile */}
          <div className="flex md:hidden items-center space-x-4">
            {/* Bouton d'authentification mobile */}
            <AnimatePresence mode="wait">
              {status === 'loading' ? (
                <motion.div
                  key="loading-mobile"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 animate-pulse bg-gray-800/50 rounded-full"
                />
              ) : session ? (
                <motion.div
                  key="user-profile-mobile"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="relative mobile-user-menu"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMobileUserMenuOpen(!isMobileUserMenuOpen);
                    }}
                    className="mobile-user-button flex items-center justify-center text-gray-300 hover:text-white 
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      w-10 h-10 rounded-full border border-purple-500/20 hover:border-purple-500/40"
                    aria-label="Menu utilisateur"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500/50">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || 'Avatar'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-1" />
                      )}
                    </div>
                  </button>

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
                        className="absolute right-0 mt-2 w-48 rounded-lg bg-black/95 backdrop-blur-lg border border-purple-500/20 shadow-lg shadow-purple-500/5 overflow-hidden"
                      >
                        <div className="py-1">
                          <div className="px-4 py-2 text-sm text-white border-b border-purple-500/20 mb-1">
                            {session.user?.name || 'Utilisateur'}
                          </div>
                          {session.user?.role === 'ADMIN' && (
                            <Link
                              href="/admin"
                              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                              onClick={() => setIsMobileUserMenuOpen(false)}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Panel Admin
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                            onClick={() => setIsMobileUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profil
                          </Link>
                          <button
                            onClick={() => {
                              signOut();
                              setIsMobileUserMenuOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="login-button-mobile"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <button
                    onClick={() => {
                      // Ouvrir le modal immédiatement
                      setIsAuthModalOpen(true);
                    }}
                    className="text-gray-300 hover:text-white transition-all duration-300
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      p-2 rounded-full border border-purple-500/20 hover:border-purple-500/40"
                    aria-label="Connexion"
                  >
                    <User className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton menu mobile */}
            <button
              className="text-white hover:text-purple-400 transition-colors duration-300 mobile-menu-button
                bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                p-2 rounded-full border border-purple-500/20 hover:border-purple-500/40"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* Menu mobile dropdown - contient uniquement la navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                transition: {
                  height: { duration: 0.3 },
                  opacity: { duration: 0.2 },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: {
                  height: { duration: 0.3 },
                  opacity: { duration: 0.1 },
                },
              }}
              className="md:hidden mobile-menu bg-black/95 backdrop-blur-md border-b border-purple-500/20 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col space-y-3">
                {links.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.15 }}
                  >
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white py-2 transition-colors flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.icon && <link.icon size={18} className="text-purple-400" />}
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default Navigation;
