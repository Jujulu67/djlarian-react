'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import PosterState from '@/components/v3/PosterState';
import { useUiVersion } from '@/hooks/useUiVersion';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const uiVersion = useUiVersion();
  const { data: session } = useSession();
  const [shopEnabled, setShopEnabled] = useState<boolean | null>(null);
  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetch('/api/shop/settings')
      .then((res) => res.json())
      .then((data) => {
        setShopEnabled(data.shopEnabled !== false);
      })
      .catch(() => setShopEnabled(true));
  }, []);

  // Show loading state to prevent flash
  if (shopEnabled === null) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin v2:border-white/20 v2:border-t-brand" />
      </div>
    );
  }

  // Show disabled message for non-admins
  if (!shopEnabled && !isAdmin && uiVersion === 'v3') {
    return (
      <PosterState
        code="Bientôt"
        word="SHOP"
        title="La boutique se prépare"
        description="Plugins, sample packs et merch arrivent. En attendant, la musique est déjà là."
        action={{ label: 'Écouter les sorties', href: '/music' }}
      />
    );
  }

  if (!shopEnabled && !isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center glass-modern p-12 rounded-2xl max-w-md mx-4 v2:p-10">
          <div className="hidden v2:mx-auto v2:mb-6 v2:flex v2:h-14 v2:w-14 v2:items-center v2:justify-center v2:rounded-full v2:bg-white/[0.04]">
            <ShoppingBag className="h-6 w-6 text-white/70" aria-hidden="true" />
          </div>
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-6 v2:hidden" />
          <h1 className="text-2xl font-bold text-white mb-4 v2:text-xl v2:font-semibold v2:mb-2">
            Boutique Indisponible
          </h1>
          <p className="text-gray-400 mb-6 v2:text-white/60">
            La boutique est temporairement fermée. Revenez bientôt !
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:font-semibold v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] v2:hover:brightness-110 v2:active:scale-[0.98]"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Admin preview banner */}
      {!shopEnabled && isAdmin && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 sticky top-0 z-40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto v2:max-w-[1180px] flex items-center justify-center gap-2 text-yellow-300 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Mode aperçu admin - La boutique est désactivée pour les visiteurs
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
