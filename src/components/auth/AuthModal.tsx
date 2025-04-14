'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Préparation du modal avec un court délai pour permettre une animation fluide
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => {
        clearTimeout(timer);
        setIsReady(false);
      };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Connexion
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error(
            result.error === 'CredentialsSignin' ? 'Email ou mot de passe incorrect' : result.error
          );
          return;
        }

        toast.success('Connexion réussie !');
        onClose();
      } else {
        // Inscription
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Une erreur est survenue lors de l'inscription");
          return;
        }

        // Connexion automatique après inscription
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error('Erreur lors de la connexion automatique');
          return;
        }

        toast.success('Inscription réussie !');
        onClose();
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      const result = await signIn(provider, { redirect: false });
      if (result?.error) {
        toast.error(`Erreur de connexion avec ${provider}`);
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Affichage d'un loader avant l'animation complète */}
          <AnimatePresence mode="wait">
            {!isReady ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <svg
                    className="animate-spin h-8 w-8 text-purple-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </motion.div>
            ) : (
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
                className="bg-gradient-to-br from-purple-900/50 to-black/50 backdrop-blur-xl p-8 rounded-2xl w-full max-w-md relative overflow-hidden border border-purple-500/20"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10"
                  animate={{
                    background: [
                      'linear-gradient(to bottom right, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))',
                      'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                      'linear-gradient(to bottom right, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))',
                    ],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'linear',
                  }}
                />

                <h2 className="text-2xl font-audiowide mb-6 text-center relative z-10">
                  {isLogin ? 'Connexion' : 'Inscription'}
                </h2>

                <div className="space-y-4 relative z-10">
                  <button
                    onClick={() => handleProviderSignIn('google')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white text-gray-900 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <img src="/icons/google.svg" alt="Google" className="w-5 h-5" />
                    )}
                    Continuer avec Google
                  </button>

                  <button
                    onClick={() => handleProviderSignIn('twitch')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#9146FF] text-white rounded-lg flex items-center justify-center gap-2 hover:bg-[#7c2cff] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <img src="/icons/twitch.svg" alt="Twitch" className="w-5 h-5" />
                    )}
                    Continuer avec Twitch
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-500/30" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-black/50 text-gray-400">Ou</span>
                    </div>
                  </div>

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
                      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                      {isLogin ? 'Se connecter' : "S'inscrire"}
                    </button>
                  </form>

                  <p className="text-center text-sm text-gray-400">
                    {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      disabled={isLoading}
                    >
                      {isLogin ? "S'inscrire" : 'Se connecter'}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
