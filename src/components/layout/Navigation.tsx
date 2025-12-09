'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  User,
  LogOut,
  Music,
  Calendar,
  ImageIcon,
  Mail,
  Settings,
  Home,
  FolderKanban,
  Bell,
  History,
  Radio,
  Gamepad2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import React from 'react';

import { logger } from '@/lib/logger';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

import AuthModal from '../auth/AuthModal';
import { MilestoneInbox } from '@/components/projects/MilestoneInbox';
import { useNotifications } from '@/hooks/useNotifications';

const Navigation = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fonction de déconnexion simplifiée et fiable
  const handleSignOut = async () => {
    // Masquer immédiatement le profil et fermer les menus
    setIsSigningOut(true);
    setIsUserMenuOpen(false);
    setIsMobileUserMenuOpen(false);

    try {
      // Appeler l'API de déconnexion pour nettoyer les cookies côté serveur
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Navigation] Erreur API signout:', error);
    }

    // Forcer un rechargement complet de la page
    // C'est la méthode la plus fiable pour s'assurer que tout est nettoyé
    window.location.href = '/';
  };

  // Charger les notifications uniquement si l'utilisateur est connecté
  // Utiliser un hook conditionnel pour éviter les erreurs si l'utilisateur n'est pas connecté
  const notificationsHook = useNotifications({
    unreadOnly: true,
    autoRefresh: status === 'authenticated',
    refreshInterval: 30000, // 30 secondes pour une mise à jour plus rapide des messages
    refreshOnPageChange: false, // Désactivé par défaut pour économiser les requêtes
  });
  const unreadCount = status === 'authenticated' ? notificationsHook.unreadCount : 0;

  // Vérifier les notifications au chargement si l'utilisateur est connecté
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Vérifier les notifications en arrière-plan (optimisé)
      // Utiliser un timeout pour éviter de bloquer le rendu initial
      const timeoutId = setTimeout(() => {
        fetchWithAuth('/api/notifications/check-all').catch((error) => {
          // Ignorer les erreurs silencieusement (peuvent être causées par des extensions)
          if (error.name !== 'AbortError') {
            // Erreur silencieuse - pas besoin de logger
          }
        });
      }, 1000); // Attendre 1 seconde après le chargement

      return () => clearTimeout(timeoutId);
    }
  }, [status, session?.user?.id]);

  // Error boundary pour capturer les erreurs
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      logger.error('Navigation error caught:', {
        message: event.message,
        error: event.error,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        pathname: pathname,
      });
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      logger.error('Navigation unhandled promise rejection:', {
        reason: event.reason,
        pathname: pathname,
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, [pathname]);

  // Debug: Afficher les informations de session (désactivé pour réduire les logs)
  // useEffect(() => {
  //   if (session) {
  //     logger.debug('Session:', session);
  //     logger.debug('User role:', session?.user?.role);
  //   }
  // }, [session]);

  useEffect(() => {
    try {
      setMounted(true);
      let timeout: NodeJS.Timeout | null = null;
      const handleScroll = () => {
        try {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            setIsScrolled(window.scrollY > 10);
          }, 30);
        } catch (error) {
          logger.error('Error in scroll handler:', error);
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
      return () => {
        if (timeout) clearTimeout(timeout);
        if (typeof window !== 'undefined') {
          window.removeEventListener('scroll', handleScroll);
        }
      };
    } catch (error) {
      logger.error('Error in Navigation mount effect:', error);
    }
  }, []);

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/music', label: 'Music', icon: Music },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/live', label: 'Live', icon: Radio },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/contact', label: 'Contact', icon: Mail },
  ];

  // Fermer les menus quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        if (!target) return;

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
      } catch (error) {
        logger.error('Error in click outside handler:', error);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen, isMobileMenuOpen, isMobileUserMenuOpen]);

  // Safe render check with fallback UI to prevent errors
  if (!mounted || typeof window === 'undefined') {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-purple-500/10">
        <nav className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
          <div className="text-xl sm:text-2xl font-audiowide text-white">LARIAN</div>
        </nav>
      </header>
    );
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-black/90 backdrop-blur-xl border-b border-purple-500/20 border-opacity-100 shadow-2xl shadow-purple-500/10'
            : 'bg-gradient-to-b from-black/70 via-black/50 to-transparent border-b border-purple-500/10 border-opacity-0 shadow-none'
        }`}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-50" />
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, transparent 50%, rgba(59, 130, 246, 0.1) 100%)',
            backgroundSize: '200% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            animation: isScrolled ? 'gradient-shift 8s ease infinite' : 'none',
          }}
        />

        {/* Glow effect on scroll */}
        {isScrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-glow-pulse" />
        )}

        <nav className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between relative z-10 gap-2 sm:gap-4">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-audiowide text-white lg:hover:text-transparent lg:hover:bg-clip-text lg:hover:bg-gradient-to-r lg:hover:from-purple-400 lg:hover:via-blue-400 lg:hover:to-purple-400 active:text-white transition-all duration-300 relative group shrink-0"
          >
            <span className="relative z-10">LARIAN</span>
            {isScrolled && (
              <span className="hidden lg:block absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-shift bg-[length:200%_100%]" />
            )}
          </Link>

          {/* Version desktop - visible from lg breakpoint to avoid overlaps */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {links.map((link) => {
              // Safe pathname check to avoid errors
              const isActive = pathname
                ? pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                : false;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/90 hover:text-white transition-all duration-300 flex items-center gap-1.5 xl:gap-2 hover:scale-105 group relative px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg focus:outline-none text-sm xl:text-base"
                >
                  {/* Glassmorphism overlay on focus/active - iOS style with improved texture */}
                  <span
                    className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none overflow-hidden ${
                      isActive
                        ? 'opacity-100'
                        : 'opacity-0 group-focus-within:opacity-100 focus-within:opacity-100'
                    }`}
                    style={{
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      backgroundColor: isActive
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backgroundImage: isActive
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.08) 75%, rgba(255, 255, 255, 0.18) 100%)'
                        : 'none',
                      backgroundSize: isActive ? '300% 300%' : 'auto',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      boxShadow: isActive
                        ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                        : 'none',
                      animation: isActive ? 'veil-shift 6s ease-in-out infinite' : 'none',
                    }}
                  >
                    {/* Animated texture overlay for visible movement */}
                    <span
                      className={`absolute inset-0 transition-opacity duration-200 ${
                        isActive ? 'opacity-40' : 'opacity-0'
                      }`}
                      style={{
                        backgroundImage: `
                          radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
                          radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.12) 0%, transparent 40%),
                          linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)
                        `,
                        backgroundSize: '150% 150%, 150% 150%, 250% 250%',
                        mixBlendMode: 'overlay',
                        animation: isActive ? 'veil-shift 8s ease-in-out infinite reverse' : 'none',
                      }}
                    />
                  </span>

                  {link.icon && (
                    <link.icon
                      size={18}
                      className={`relative z-10 transition-all duration-300 ${
                        isActive
                          ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                          : 'group-hover:text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                      }`}
                    />
                  )}
                  <span className="relative z-10">
                    {link.label}
                    <span
                      className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </span>
                </Link>
              );
            })}

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
              ) : session && !isSigningOut ? (
                <>
                  {/* Icône de notifications */}
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                    }}
                    className="relative"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInboxOpen(!isInboxOpen);
                        setIsUserMenuOpen(false);
                      }}
                      className="relative p-2 text-white/90 hover:text-white transition-all duration-300
                        bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                        rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                      )}
                    </button>
                  </motion.div>

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
                      className={`flex items-center text-white/90 hover:text-white transition-all duration-300
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105
                      ${session.user?.image ? 'space-x-2 px-2 py-1' : 'space-x-3 px-4 py-2'}`}
                    >
                      {session.user?.image ? (
                        <div className="relative w-11 h-11 rounded-full overflow-hidden">
                          <Image
                            src={
                              session.user.image.startsWith('http://') ||
                              session.user.image.startsWith('https://')
                                ? session.user.image.includes('googleusercontent.com')
                                  ? `/api/images/proxy?url=${encodeURIComponent(session.user.image)}`
                                  : session.user.image
                                : session.user.image
                            }
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
                                <Link
                                  href="/admin"
                                  className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
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
                                className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
                              >
                                <User className="w-4 h-4 mr-2" />
                                Profil
                              </Link>
                            </motion.div>
                            <motion.div
                              initial={{ x: -5, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.12, duration: 0.1 }}
                            >
                              <Link
                                href="/projects"
                                className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
                              >
                                <FolderKanban className="w-4 h-4 mr-2" />
                                Mes Projets
                              </Link>
                            </motion.div>

                            {/* Jeu / Arcade Link - Conditional */}
                            {(session.user?.gameHighScore || 0) > 0 ||
                            session.user?.hasDiscoveredCasino ? (
                              <motion.div
                                initial={{ x: -5, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.15, duration: 0.1 }}
                              >
                                <Link
                                  href="/games"
                                  className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
                                >
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
                              <button
                                onClick={handleSignOut}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-inset"
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
                </>
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
                    className="text-white/90 hover:text-white transition-all duration-300
                      bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                      px-4 py-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
                  >
                    Connexion
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Version mobile/tablet - visible up to lg breakpoint */}
          <div className="flex lg:hidden items-center space-x-3 sm:space-x-4">
            {/* Bouton de notifications mobile */}
            {session && (
              <motion.div
                key="notifications-mobile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                className="relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInboxOpen(!isInboxOpen);
                  }}
                  className="relative p-2 text-white/90 hover:text-white transition-all duration-300
                    bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20
                    rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </button>
              </motion.div>
            )}
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
              ) : session && !isSigningOut ? (
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
                              className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
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
                            className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
                            onClick={() => setIsMobileUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profil
                          </Link>
                          <Link
                            href="/projects"
                            className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
                            onClick={() => {
                              setIsMobileUserMenuOpen(false);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <FolderKanban className="w-4 h-4 mr-2" />
                            Mes Projets
                          </Link>

                          {/* Jeu / Arcade Link - Conditional Mobile */}
                          {(session.user?.gameHighScore || 0) > 0 ||
                          session.user?.hasDiscoveredCasino ? (
                            <Link
                              href="/games"
                              className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-purple-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-inset"
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
                            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-inset"
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
                    className="text-white/90 hover:text-white transition-all duration-300
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
                p-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 overflow-hidden"
              style={{ borderRadius: '9999px' }}
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
              className="lg:hidden mobile-menu bg-black/95 backdrop-blur-md border-b border-purple-500/20 overflow-hidden rounded-b-2xl"
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              <div
                className="container mx-auto px-4 py-4 flex flex-col space-y-3"
                style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
              >
                {links.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.15 }}
                  >
                    <Link
                      href={link.href}
                      className="text-white/90 hover:text-white py-2 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset rounded"
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
      {session && <MilestoneInbox isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />}
    </>
  );
};

export default Navigation;
