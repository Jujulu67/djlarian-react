'use client';

import { useSession } from 'next-auth/react';
import {
  UserLicenseCard,
  UserLicense,
  LicenseActivation,
} from '@/components/licenses/UserLicenseCard';
import { KeyRound, ShoppingBag, ExternalLink, Ghost } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { Prisma } from '@prisma/client';

type UserLicenseWithDetails = Prisma.LicenseGetPayload<{
  include: {
    activations: true;
  };
}>;

interface RawActivation extends Omit<LicenseActivation, 'lastValidated'> {
  lastValidated: string;
}

interface RawLicense extends Omit<UserLicense, 'createdAt' | 'activations'> {
  createdAt: string;
  activations: RawActivation[];
}

export default function LicensesPage() {
  const { data: session, status } = useSession();
  const [licenses, setLicenses] = useState<UserLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      if (status !== 'authenticated' || !session?.user?.id) return;

      try {
        const response = await fetchWithAuth(`/api/users/${session.user.id}/licenses`);
        if (response.ok) {
          const data = (await response.json()) as RawLicense[];
          const formattedLicenses: UserLicense[] = data.map((l) => ({
            ...l,
            createdAt: new Date(l.createdAt),
            activations: l.activations.map((a) => ({
              ...a,
              lastValidated: new Date(a.lastValidated),
            })),
          }));
          setLicenses(formattedLicenses);
        } else {
          setError('Erreur lors du chargement des licences');
        }
      } catch (err) {
        console.error('Failed to fetch licenses:', err);
        setError('Erreur de connexion');
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      loadLicenses();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [session, status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white font-audiowide text-xl"
        >
          Initialisation...
        </motion.div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-modern p-8 rounded-2xl text-center max-w-md border-white/10"
        >
          <Ghost className="w-16 h-16 mx-auto mb-4 text-purple-500/50" />
          <h1 className="text-2xl font-audiowide text-white mb-4">Accès réservé</h1>
          <p className="text-gray-400 mb-8">Veuillez vous connecter pour voir vos licences.</p>
          <Link href="/auth/signin?callbackUrl=/licenses">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full px-8"
            >
              Se connecter
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pt-24 pb-12">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div>
              <motion.h1 className="text-4xl md:text-5xl font-audiowide text-white mb-2 flex items-center justify-center md:justify-start gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <KeyRound className="w-10 h-10 text-purple-400" />
                </motion.div>
                <span className="text-gradient-animated">Mes Licences</span>
              </motion.h1>
              <p className="text-gray-400 text-lg">
                Gérez vos licences logicielles et vos appareils activés.
              </p>
            </div>

            <Link href="/shop" className="hidden md:block">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full px-8 py-6 text-lg font-bold shadow-lg shadow-purple-500/20 btn-modern">
                  <ShoppingBag className="w-5 h-5 mr-3" />
                  Boutique
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Content */}
          <motion.div layout className="space-y-6">
            <AnimatePresence mode="popLayout">
              {licenses.length > 0 ? (
                licenses.map((license, index) => (
                  <motion.div
                    key={license.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <UserLicenseCard license={license} userEmail={session?.user?.email} />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-modern border border-white/10 rounded-2xl p-12 text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent pointer-events-none" />

                  <div className="relative z-10">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-24 h-24 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl"
                    >
                      <KeyRound className="w-12 h-12 text-gray-500" />
                    </motion.div>

                    <h3 className="text-2xl font-audiowide text-white mb-4 italic">
                      Aucune licence trouvée
                    </h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-10 text-lg leading-relaxed">
                      Exploitez tout le potentiel de votre musique avec nos plugins professionnels.
                      Visitez la boutique pour obtenir votre première licence.
                    </p>

                    <Link href="/shop">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="lg"
                          className="bg-white !text-black hover:bg-gray-200 rounded-full px-10 py-7 text-xl font-bold transition-all shadow-xl"
                        >
                          Voir les plugins
                          <ExternalLink className="w-6 h-6 ml-3" />
                        </Button>
                      </motion.div>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
