'use client';

import { motion } from 'framer-motion';
import { CreditCard, Crown, FileText } from 'lucide-react';

import { type ShopSettings } from './types';

interface PurchaseSectionProps {
  shopSettings: ShopSettings;
}

export function PurchaseSection({ shopSettings }: PurchaseSectionProps) {
  return (
    <section id="purchase" className="py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center glass-modern rounded-2xl p-8 md:p-12 border-purple-500/30"
      >
        <Crown className="w-12 h-12 text-purple-400 mx-auto mb-6" />

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get LarianCrusher</h2>

        <p className="text-gray-400 mb-2">Lifetime license • Free updates • 1 user, 3 machines</p>

        <div className="text-5xl font-bold text-white my-8">
          €{shopSettings.productPrice}
          <span className="text-lg text-gray-400 font-normal ml-2">one-time</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <a
            href={shopSettings.stripePaymentLink || '/licenses'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg btn-modern glow-purple animate-glow-pulse"
          >
            <CreditCard className="w-5 h-5" />
            Purchase Now
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
          <span className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
            <FileText className="w-4 h-4" />
            Changelog
          </span>
          <span className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
            <FileText className="w-4 h-4" />
            Documentation
          </span>
        </div>
      </motion.div>
    </section>
  );
}
