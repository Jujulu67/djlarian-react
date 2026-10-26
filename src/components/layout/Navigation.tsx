'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Menu, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import AuthModal from '../auth/AuthModal';
import { MilestoneInbox } from '@/components/projects/MilestoneInbox';
import { useNotifications } from '@/hooks/useNotifications';
import { getNavLinks } from './navigation/navigationConfig';
import { isNavLinkActive } from './navigation/navigationUtils';
import { DesktopNavLink } from './navigation/DesktopNavLink';
import { DesktopUserMenuToggle } from './navigation/DesktopUserMenuToggle';
import { DesktopUserDropdown } from './navigation/DesktopUserDropdown';
import { MobileUserMenuToggle } from './navigation/MobileUserMenuToggle';
import { MobileUserDropdown } from './navigation/MobileUserDropdown';
import { MobileNavDropdown } from './navigation/MobileNavDropdown';
import {
  useNotificationCheck,
  useRouteErrorLogging,
  useHeaderScroll,
  useShopEnabled,
  useClickOutsideMenus,
} from './navigation/useNavigationEffects';

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

  useNotificationCheck(status, session?.user?.id);

  useRouteErrorLogging(pathname);

  const isScrolled = useHeaderScroll(setMounted);

  const shopEnabled = useShopEnabled();

  useClickOutsideMenus({
    isUserMenuOpen,
    isMobileMenuOpen,
    isMobileUserMenuOpen,
    setIsUserMenuOpen,
    setIsMobileMenuOpen,
    setIsMobileUserMenuOpen,
  });

  // Debug: Afficher les informations de session (désactivé pour réduire les logs)
  // useEffect(() => {
  //   if (session) {
  //     logger.debug('Session:', session);
  //     logger.debug('User role:', session?.user?.role);
  //   }
  // }, [session]);

  // Escape ferme le menu mobile
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  const isAdmin = session?.user?.role === 'ADMIN';

  const links = getNavLinks(shopEnabled, isAdmin);

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
        } ${
          /* v2 : « pilule » de verre flottante, qui se densifie au scroll */
          isScrolled
            ? 'v2:top-2 v2:bg-[rgb(9_9_11/0.72)] v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_16px_48px_-16px_rgb(0_0_0/0.8)]'
            : 'v2:top-3 v2:bg-white/[0.04] v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]'
        } v2:left-1/2 v2:right-auto v2:w-[min(1180px,calc(100%-1.5rem))] v2:-translate-x-1/2 v2:rounded-[1.75rem] v2:border v2:border-white/10 v2:bg-none v2:backdrop-blur-xl v2:backdrop-saturate-150 v2:duration-300 ${
          /* v3 : barre pleine largeur, transparente en haut de page, filet et voile au scroll */
          isScrolled
            ? 'v3:border-b-[rgb(237_235_230/0.12)] v3:bg-[rgb(5_5_6/0.78)] v3:backdrop-blur-md'
            : 'v3:border-b-transparent v3:bg-transparent v3:backdrop-blur-none'
        } v3:top-0 v3:left-0 v3:right-0 v3:w-full v3:translate-x-0 v3:rounded-none v3:border-x-0 v3:border-t-0 v3:shadow-none v3:backdrop-saturate-100`}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-50 v2:hidden" />
        <div
          className={`absolute inset-0 transition-opacity duration-500 v2:hidden ${
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
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-glow-pulse v2:hidden" />
        )}

        <nav className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between relative z-10 gap-2 sm:gap-4 v2:h-14 v2:max-w-none v2:pl-5 v2:pr-2 v3:h-16 v3:max-w-[1440px] v3:px-4 md:v3:px-8">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-audiowide text-white lg:hover:text-transparent lg:hover:bg-clip-text lg:hover:bg-gradient-to-r lg:hover:from-purple-400 lg:hover:via-blue-400 lg:hover:to-purple-400 active:text-white transition-all duration-300 relative group shrink-0 v3:font-poster v3:text-xl v3:tracking-[-0.03em]"
          >
            <span className="relative z-10">LARIAN</span>
            {isScrolled && (
              <span className="hidden lg:block absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-shift bg-[length:200%_100%]" />
            )}
          </Link>

          {/* Version desktop - visible from lg breakpoint to avoid overlaps */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8 v2:space-x-0 v2:gap-1">
            {links.map((link) => (
              <DesktopNavLink
                key={link.href}
                link={link}
                isActive={isNavLinkActive(pathname, link.href)}
              />
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
                    <DesktopUserMenuToggle
                      isUserMenuOpen={isUserMenuOpen}
                      session={session}
                      setIsUserMenuOpen={setIsUserMenuOpen}
                    />

                    <DesktopUserDropdown
                      handleSignOut={handleSignOut}
                      isUserMenuOpen={isUserMenuOpen}
                      session={session}
                    />
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
                      px-4 py-2 rounded-full border border-purple-500/20 hover:border-purple-500/40 hover:scale-105
                      v3:rounded-none v3:border-white/25 v3:bg-none v3:text-sm v3:hover:scale-100 v3:hover:border-white"
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
                  <MobileUserMenuToggle
                    isMobileUserMenuOpen={isMobileUserMenuOpen}
                    session={session}
                    setIsMobileUserMenuOpen={setIsMobileUserMenuOpen}
                  />

                  <MobileUserDropdown
                    handleSignOut={handleSignOut}
                    isMobileUserMenuOpen={isMobileUserMenuOpen}
                    session={session}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    setIsMobileUserMenuOpen={setIsMobileUserMenuOpen}
                  />
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
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* Menu mobile dropdown - contient uniquement la navigation */}
        <MobileNavDropdown
          isMobileMenuOpen={isMobileMenuOpen}
          links={links}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {session && <MilestoneInbox isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />}
    </>
  );
};

export default Navigation;
