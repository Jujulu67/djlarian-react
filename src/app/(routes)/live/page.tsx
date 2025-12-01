'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { LiveSubmissionForm } from './components/LiveSubmissionForm';
import { LiveChances } from './components/LiveChances';
import { LiveInventory } from './components/LiveInventory';
import { LiveItemShop } from './components/LiveItemShop';
import { LiveRewards } from './components/LiveRewards';
import { useLiveInventory } from './hooks/useLiveInventory';
import { useLiveRewards } from './hooks/useLiveRewards';

export default function LivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loadInventory } = useLiveInventory();
  const { loadRewards } = useLiveRewards();

  // Charger les données au montage
  useEffect(() => {
    if (session?.user?.id) {
      loadInventory();
      loadRewards();
    }
  }, [session?.user?.id, loadInventory, loadRewards]);

  // Rediriger si non connecté
  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-modern rounded-2xl p-8 text-center max-w-md"
        >
          <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-audiowide mb-4 text-white">Accès non autorisé</h1>
          <p className="text-gray-400 mb-4">
            Veuillez vous connecter pour accéder au panneau live.
          </p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Se connecter
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto pt-4 sm:pt-8 pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Grid Layout - Première ligne : Submission (2/3) et Chances (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6 items-stretch">
          {/* Submission - 2/3 de la largeur */}
          <div className="lg:col-span-2">
            <LiveSubmissionForm />
          </div>

          {/* Chances - 1/3 de la largeur */}
          <div className="lg:col-span-1">
            <LiveChances />
          </div>
        </div>

        {/* Deuxième ligne : Inventory (2/3) et Shop (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6 mt-4 sm:mt-6 lg:mt-6 items-stretch">
          {/* Inventory - 2/3 de la largeur */}
          <div className="lg:col-span-2 min-w-0 flex">
            <div className="w-full">
              <LiveInventory />
            </div>
          </div>

          {/* Shop - 1/3 de la largeur */}
          <div className="lg:col-span-1 flex">
            <div className="w-full">
              <LiveItemShop />
            </div>
          </div>
        </div>

        {/* Section Rewards en bas (pleine largeur) */}
        <div className="mt-4 sm:mt-6 lg:mt-6">
          <LiveRewards />
        </div>
      </div>
    </div>
  );
}
