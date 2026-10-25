'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useUiVersion } from '@/hooks/useUiVersion';

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

/** Titre de section centré : animé par framer en legacy, par <Reveal> en v2 */
function SectionIntro({
  isV2,
  title,
  description,
}: {
  isV2: boolean;
  title: string;
  description: ReactNode;
}) {
  if (isV2) {
    return (
      <Reveal className="mb-12 text-center">
        <h2 className="text-display mb-4 text-3xl text-white md:text-4xl">{title}</h2>
        <p className="mx-auto max-w-2xl text-white/60">{description}</p>
      </Reveal>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
      <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LarianCrusherPage() {
  const shopSettings = useShopSettings();
  const isV2 = useUiVersion() === 'v2';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection shopSettings={shopSettings} />

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 v2:py-16 md:v2:py-24">
        <div className="max-w-6xl mx-auto v2:max-w-[1180px]">
          <SectionIntro
            isV2={isV2}
            title="Packed with Features"
            description="Everything you need for creative distortion and sound design"
          />

          <RevealGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <RevealItem key={idx} className="h-full">
                <FeatureCard feature={feature} index={idx} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* View Modes Showcase */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent v2:bg-none v2:py-16 md:v2:py-24">
        <div className="max-w-5xl mx-auto">
          <SectionIntro
            isV2={isV2}
            title="5 Unique Views"
            description="Switch between interfaces to match your workflow"
          />

          <Reveal>
            <ViewModeSelector />
          </Reveal>
        </div>
      </section>

      {/* LFO & Visualizer Showcase */}
      <section className="py-20 px-4 v2:py-16 md:v2:py-24">
        <div className="max-w-5xl mx-auto">
          <SectionIntro
            isV2={isV2}
            title="Deep Modulation"
            description="Powerful LFO system and real-time visualization"
          />

          <Reveal>
            <ShowcaseSection />
          </Reveal>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent v2:bg-none v2:py-16 md:v2:py-24">
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
      <section className="py-20 px-4 v2:py-16 md:v2:py-24">
        <div className="max-w-4xl mx-auto">
          <TechSpecsSection />
        </div>
      </section>

      {/* Purchase CTA */}
      <PurchaseSection shopSettings={shopSettings} />

      {/* Back to Shop */}
      <section className="py-10 px-4 v2:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <Link
            href="/shop"
            className="text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 v2:text-white/60 v2:hover:text-white"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Shop
          </Link>
        </div>
      </section>
    </div>
  );
}
