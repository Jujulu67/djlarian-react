'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Lock, User } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUiVersion } from '@/hooks/useUiVersion';

import { LiveSubmissionForm } from './components/LiveSubmissionForm';
import { LiveChances } from './components/LiveChances';
import { LiveInventory } from './components/LiveInventory';
import { LiveItemShop } from './components/LiveItemShop';
import { LiveRewards } from './components/LiveRewards';
import { LiveInventoryProvider, useLiveInventoryContext } from './context/LiveInventoryContext';
import { useLiveRewards } from './hooks/useLiveRewards';
import PosterState from '@/components/v3/PosterState';

function LivePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loadInventory } = useLiveInventoryContext();
  const { loadRewards } = useLiveRewards();
  const uiVersion = useUiVersion();
  const isV2 = uiVersion !== 'legacy';

  // Charger les données au montage
  useEffect(() => {
    if (session?.user?.id) {
      loadInventory();
      loadRewards();
    }
  }, [session?.user?.id, loadInventory, loadRewards]);

  // Rediriger si non connecté
  if (status === 'loading') {
    if (isV2) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" aria-hidden="true" />
          <span className="sr-only">Chargement...</span>
        </div>
      );
    }
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    if (uiVersion === 'v3') {
      return (
        <PosterState
          code="Membres"
          word="LIVE"
          title="Le live, côté coulisses"
          description="Soumets tes morceaux, gagne des tickets et suis les sets en direct. Connecte-toi pour entrer."
          action={{ label: 'Se connecter', onClick: () => router.push('/api/auth/signin') }}
        />
      );
    }
    if (isV2) {
      // État vide : accès réservé aux membres connectés
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="surface-1 flex w-full max-w-md flex-col items-center rounded-2xl px-6 py-12 text-center">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
              <Lock className="h-6 w-6 text-white/70" aria-hidden="true" />
            </span>
            <h1 className="mb-2 text-xl font-semibold text-white">Accès non autorisé</h1>
            <p className="mb-6 text-sm text-white/60">
              Veuillez vous connecter pour accéder au panneau live.
            </p>
            <Button onClick={() => router.push('/api/auth/signin')}>Se connecter</Button>
          </div>
        </div>
      );
    }
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
    <div className="h-[calc(100vh-4rem)] overflow-y-auto pt-4 sm:pt-8 pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8 v2:h-auto v2:min-h-[calc(100vh-4rem)] v2:overflow-visible v2:px-4 v2:pb-16 v2:pt-16 md:v2:pb-24 md:v2:pt-24">
      <div className="max-w-7xl mx-auto v2:max-w-[1180px]">
        {isV2 && (
          <PageHeader
            eyebrow="Live"
            title="Panneau live"
            description="Soumets ta track, suis tes chances et gère tes items pendant le stream."
          />
        )}

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

export default function LivePage() {
  return (
    <LiveInventoryProvider>
      <LivePageContent />
    </LiveInventoryProvider>
  );
}
