'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import AuthModal from '../auth/AuthModal';
import { Menu, User, LogOut, Music, Calendar, ImageIcon, Mail, Settings } from 'lucide-react';
import Image from 'next/image';

const Navigation = () => {
  const { data: session, status } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/music', label: 'Music', icon: Music },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/contact', label: 'Contact', icon: Mail },
  ];

  // Fermer le menu utilisateur quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isUserMenuOpen && !target.closest('.user-menu')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  if (!mounted) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-black/95 backdrop-blur-lg border-b border-purple-500/10 shadow-lg shadow-purple-500/5'
            : 'bg-gradient-to-b from-black/80 to-transparent'
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
            {status === 'loading' ? (
              // Placeholder pendant le chargement pour éviter le saut de layout
              // Vous pouvez remplacer ceci par un Skeleton si vous en avez un
              <div className="w-[120px] h-[40px] animate-pulse bg-gray-800/50 rounded-full"></div>
            ) : session ? (
              <div className="relative user-menu">
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
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 rounded-lg bg-black/95 backdrop-blur-lg border border-purple-500/20 shadow-lg shadow-purple-500/5 overflow-hidden"
                    >
                      <div className="py-1">
                        {session.user?.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Panel Admin
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                        >
                          <User className="w-4 h-4 mr-2" />
                          Profil
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Déconnexion
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-gray-300 hover:text-white transition-all duration-300
                  bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                  px-4 py-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
              >
                Connexion
              </button>
            )}
          </div>

          {/* Menu mobile */}
          <button className="md:hidden text-white hover:text-purple-400 transition-colors duration-300">
            <Menu className="w-6 h-6" />
          </button>
        </nav>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default Navigation;
