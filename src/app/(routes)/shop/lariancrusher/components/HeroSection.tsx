'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Crown, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { VersionBadge } from './VersionBadge';
import { GIFS_BASE_PATH } from './constants';
import { type ShopSettings } from './types';

interface HeroSectionProps {
  shopSettings: ShopSettings;
}

export function HeroSection({ shopSettings }: HeroSectionProps) {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-black to-blue-900/40 animate-gradient-shift bg-[length:200%_200%]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-600/30 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-gray-400 text-sm mb-8"
        >
          <Link href="/shop" className="hover:text-white transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">LarianCrusher</span>
        </motion.div>

        <div className="grid md:grid-cols-[1fr_1.15fr] gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium mb-6">
              <Crown className="w-4 h-4" />
              Professional Plugin
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-gradient-animated">LarianCrusher</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-6">
              Multi-Mode Distortion & Sound Design
            </p>

            <p className="text-gray-400 mb-8 text-lg leading-relaxed">
              The ultimate distortion plugin featuring 5 unique view modes, 27 factory presets,
              advanced LFO modulation, and a modern WebView UI. From subtle saturation to complete
              sonic destruction.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="#purchase"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg btn-modern glow-purple"
              >
                <Download className="w-5 h-5" />
                Get LarianCrusher — €{shopSettings.productPrice}
              </a>
              <Link
                href="#features"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                Learn more
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Right: Plugin preview placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative justify-self-end md:scale-[1.06] lg:scale-[1.12] origin-left md:translate-x-6 lg:translate-x-10"
          >
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 overflow-hidden">
              <Image
                src={`${GIFS_BASE_PATH}/GlobalOverview.gif`}
                alt="LarianCrusher overview demo"
                width={1000}
                height={700}
                unoptimized
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Floating badge - dynamic version */}
            <VersionBadge />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
