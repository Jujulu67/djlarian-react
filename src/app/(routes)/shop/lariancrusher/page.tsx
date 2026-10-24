'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { BeforeAfterSection } from './components/BeforeAfterSection';
import { HeroSection } from './components/HeroSection';
import { PurchaseSection } from './components/PurchaseSection';
import { FeatureCard } from './components/FeatureCard';
import { FEATURES } from './components/constants';
import { ShowcaseSection } from './components/ShowcaseSection';
import { TechSpecsSection } from './components/TechSpecsSection';
import { useShopSettings } from './components/useShopSettings';
import { ViewModeSelector } from './components/ViewModeSelector';

// ============================================================================
// TYPES & DATA
// ============================================================================

// ============================================================================
// COMPONENTS
// ============================================================================

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LarianCrusherPage() {
  const shopSettings = useShopSettings();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection shopSettings={shopSettings} />

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Packed with Features</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need for creative distortion and sound design
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <FeatureCard key={idx} feature={feature} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* View Modes Showcase */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">5 Unique Views</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Switch between interfaces to match your workflow
            </p>
          </motion.div>

          <ViewModeSelector />
        </div>
      </section>

      {/* LFO & Visualizer Showcase */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Deep Modulation</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Powerful LFO system and real-time visualization
            </p>
          </motion.div>

          <ShowcaseSection />
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <BeforeAfterSection />
          </motion.div>
        </div>
      </section>

      {/* Tech Specs */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <TechSpecsSection />
        </div>
      </section>

      {/* Purchase CTA */}
      <PurchaseSection shopSettings={shopSettings} />

      {/* Back to Shop */}
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Link
            href="/shop"
            className="text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Shop
          </Link>
        </div>
      </section>
    </div>
  );
}
