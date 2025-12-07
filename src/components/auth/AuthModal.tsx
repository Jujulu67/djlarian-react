'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import Modal from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableProviders {
  google: boolean;
  twitch: boolean;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AvailableProviders>({
    google: false,
    twitch: false,
  });
  const [providersLoading, setProvidersLoading] = useState(true);

  // Nettoyer callbackUrl de l'URL au montage pour éviter les boucles
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('callbackUrl')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('callbackUrl');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Vérifier les providers disponibles au montage
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers');
        if (response.ok) {
          const providers = await response.json();
          setAvailableProviders(providers);
        }
      } catch (error) {
        logger.error('Erreur lors de la vérification des providers', error);
      } finally {
        setProvidersLoading(false);
      }
    };

    if (isOpen) {
      checkProviders();
    }
  }, [isOpen]);

  // Fonction pour gérer le succès de connexion
  const handleLoginSuccess = useCallback(() => {
    toast.success('Connexion réussie !');
    onClose();
    // Recharger la page pour récupérer la nouvelle session
    window.location.href = '/';
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // === CONNEXION via API custom ===
        const response = await fetch('/api/auth/signin-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.error) {
          let errorMessage = 'Email ou mot de passe incorrect';

          if (data.error === 'CredentialsSignin') {
            errorMessage = 'Email ou mot de passe incorrect';
          } else if (data.error === 'Configuration error') {
            errorMessage = 'Erreur de configuration serveur';
          } else if (data.error) {
            errorMessage = data.error;
          }

          console.error('[AuthModal] Erreur de connexion:', data.error);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        // Connexion réussie
        handleLoginSuccess();
      } else {
        // === INSCRIPTION ===
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[AuthModal] Erreur inscription:', data.error);
          toast.error(data.error || "Une erreur est survenue lors de l'inscription");
          setIsLoading(false);
          return;
        }

        // Inscription réussie, connexion automatique via API custom
        toast.success('Inscription réussie !');

        const loginResponse = await fetch('/api/auth/signin-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        const loginData = await loginResponse.json().catch(() => ({}));

        if (!loginResponse.ok || loginData.error) {
          console.error('[AuthModal] Erreur connexion après inscription:', loginData.error);
          toast.success('Veuillez vous connecter maintenant.');
          setIsLogin(true);
          setIsLoading(false);
          return;
        }

        // Connexion réussie
        handleLoginSuccess();
      }
    } catch (error) {
      console.error('[AuthModal] Erreur:', error);
      toast.error('Une erreur est survenue');
      logger.error("Erreur lors de l'authentification", error);
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: string) => {
    setIsLoading(true);

    try {
      // Fermer le modal avant la redirection OAuth
      onClose();

      // Nettoyer l'URL actuelle
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('callbackUrl');
      const currentPath = currentUrl.pathname;

      // Si on est sur la page d'accueil, ne pas passer de callbackUrl
      const callbackUrl = currentPath === '/' ? undefined : currentPath;

      // Appeler signIn avec redirect: true pour OAuth
      await signIn(provider, {
        redirect: true,
        ...(callbackUrl && { callbackUrl }),
      });
    } catch (error) {
      console.error('[AuthModal] Erreur OAuth:', error);
      setIsLoading(false);
      toast.error(`Erreur de connexion avec ${provider}`);
      logger.error('Erreur lors de la connexion OAuth', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal maxWidth="max-w-md" showLoader={false}>
      <motion.div
        key="content"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: {
            type: 'spring',
            damping: 35,
            stiffness: 200,
            duration: 0.4,
            ease: 'easeOut',
          },
        }}
        exit={{
          scale: 0.97,
          opacity: 0,
          transition: {
            duration: 0.25,
            ease: 'easeIn',
          },
        }}
        className="p-0 relative z-10 w-full max-w-md"
      >
        <h2 className="text-2xl font-audiowide mb-6 text-center">
          {isLogin ? 'Connexion' : 'Inscription'}
        </h2>
        <div className="space-y-4">
          {/* Boutons OAuth */}
          {(availableProviders.google || availableProviders.twitch) && (
            <>
              {availableProviders.google && (
                <button
                  onClick={() => handleProviderSignIn('google')}
                  disabled={isLoading || providersLoading}
                  className="w-full py-3 px-4 bg-white text-gray-900 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed lift-3d"
                >
                  <Image
                    src="/icons/google.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  Continuer avec Google
                </button>
              )}
              {availableProviders.twitch && (
                <button
                  onClick={() => handleProviderSignIn('twitch')}
                  disabled={isLoading || providersLoading}
                  className="w-full py-3 px-4 bg-[#9146FF] text-white rounded-lg flex items-center justify-center gap-2 hover:bg-[#7c2cff] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed lift-3d"
                >
                  <Image
                    src="/icons/twitch.svg"
                    alt="Twitch"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  Continuer avec Twitch
                </button>
              )}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-500/30" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black/50 text-gray-400">Ou</span>
                </div>
              </div>
            </>
          )}

          {/* Message si aucun provider OAuth n'est configuré */}
          {!providersLoading && !availableProviders.google && !availableProviders.twitch && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
              <p className="font-medium mb-1">OAuth non configuré</p>
              <p className="text-xs">
                Pour activer la connexion Google/Twitch, configurez les variables d'environnement.
              </p>
            </div>
          )}

          {/* Formulaire email/password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isLogin ? 'Connexion...' : 'Inscription...'}
                </>
              ) : isLogin ? (
                'Se connecter'
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400">
            {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-white hover:text-gray-300 transition-colors"
              disabled={isLoading}
            >
              {isLogin ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </div>
      </motion.div>
    </Modal>
  );
}
