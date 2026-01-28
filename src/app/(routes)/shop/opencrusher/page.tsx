'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AudioWaveform,
  Github,
  Layers,
  Palette,
  Settings2,
  Sparkles,
  Waves,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ============================================================================
// TYPES & DATA
// ============================================================================

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: string[];
}

const OPENCRUSHER_FEATURES: Feature[] = [
  {
    icon: <Layers className="w-7 h-7" />,
    title: 'Faithful Camel‑Style Crunch',
    description:
      'Carefully tuned drive, tube and mechanical flavours that recreate the spirit of a classic.',
    details: [
      'Dial in instant mixbus grit or brutal drum destruction',
      'Optimised from blind listening sessions against the original plugin',
      'Keeps the musical, mix‑friendly top end that producers loved',
    ],
  },
  {
    icon: <AudioWaveform className="w-7 h-7" />,
    title: 'Smart Filter & Tone',
    description: 'Simple low‑pass / tone tools that live exactly where you expect them.',
    details: [
      'Low‑pass with musical resonance range',
      'Fast sweet‑spot controls – no 200‑parameter mega‑synth here',
      'Perfect for taming high‑end fizz on guitars, synths and drums',
    ],
  },
  {
    icon: <Settings2 className="w-7 h-7" />,
    title: 'Modern Host Compatibility',
    description: 'Runs on modern macOS machines where the original GUI has been broken for years.',
    details: [
      'Designed to survive OS updates and host changes',
      'No more 32‑bit bridge gymnastics or weird wrapper hacks',
      'Drop it in old projects and get your mixes back',
    ],
  },
  {
    icon: <Github className="w-7 h-7" />,
    title: 'Fully Open‑Source',
    description:
      'A community project built from observable behaviour – not from anyone’s private code.',
    details: [
      'Reverse engineering strictly by black‑box analysis (input/output listening & measurements)',
      'No decompilation, no code copying, no leaked IP',
      'Fork it, audit it, or use it as a learning resource',
    ],
  },
  {
    icon: <Palette className="w-7 h-7" />,
    title: 'Streamlined UI',
    description: 'A clean, minimal interface that feels like the original, without the cruft.',
    details: [
      'Dark, focused panel with instant visual feedback',
      'Kept intentionally simple so you stay in “ears first” mode',
      'Snappy, GPU‑friendly rendering on modern displays',
    ],
  },
];

const OPENCRUSHER_TECH = [
  { label: 'Price', value: 'Free & open‑source', highlight: true },
  { label: 'Target', value: 'Producers who miss CamelCrusher', highlight: false },
  { label: 'Platforms', value: 'macOS & Windows (modern hosts)', highlight: false },
  { label: 'Plugin Type', value: 'Digital distortion / saturation', highlight: false },
  { label: 'Source', value: 'Public Git repo (coming soon)', highlight: true },
  { label: 'License', value: 'Permissive open‑source license', highlight: true },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="glass-modern rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 group flex flex-col h-full"
    >
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-gray-400 mb-4">{feature.description}</p>

      {feature.details && feature.details.length > 0 && (
        <ul className="mt-auto space-y-2 text-sm text-gray-300">
          {feature.details.map((detail, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/80" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function TechSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-modern rounded-2xl p-6 md:p-8 border-purple-500/20"
    >
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        Open‑Source, Camel‑Inspired
      </h2>

      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <div className="space-y-4 md:w-1/2">
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            OPENCRUSHER is our love letter to a legendary free plugin. We treated the original like
            a black box: feed it audio, listen closely, measure what happens, then build our own
            engine that reacts in a similar, musical way.
          </p>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            All the DSP is written from scratch and lives in an open repository so anyone can see
            how it works, tweak it, or use it as a starting point for their own experiments. We ran
            countless null tests on the different presets to match levels, curves and dynamics as
            closely as possible, refining the algorithm until every knob felt instantly familiar.
          </p>
          <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
            Huge respect to the original Camel Audio team – they helped define the sound of an
            entire era of bedroom producers and early EDM drops. Then Apple adopted them, tucked
            their magic deep inside Logic, and the rest of us were politely invited to move on.
            OPENCRUSHER is our slightly cheeky way of saying: we still remember, and we&apos;d like
            those tones to stay accessible. Dear Apple, please read this in the friendliest tone
            possible.
          </p>
          <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 rounded-lg mt-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              OPENCRUSHER is <span className="font-semibold">inspired by</span> CamelCrusher&apos;s
              sound and workflow, but is not affiliated with, endorsed by, or based on the source
              code of the original plugin.
            </span>
          </div>
        </div>

        <div className="md:w-1/2 grid sm:grid-cols-2 gap-4">
          {OPENCRUSHER_TECH.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl transition-all duration-300 ${
                item.highlight
                  ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30'
                  : 'bg-white/5 border border-white/5'
              }`}
            >
              <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">{item.label}</p>
              <p
                className={`font-semibold text-sm ${item.highlight ? 'text-white' : 'text-gray-200'}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function OpenCrusherPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
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
            <span className="text-white">OPENCRUSHER</span>
          </motion.div>

          <div className="grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-400/30 text-green-300 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Free & Open‑Source
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="text-gradient-animated">OPENCRUSHER</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 mb-6">
                The open, modern heir to a legendary free distortion.
              </p>

              <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                After a long, nerdy journey of blind tests, tweaks and late‑night listening
                sessions, we built a plugin that brings back the feel of CamelCrusher in a modern,
                open package. Same vibe, fresh engine, zero legacy installer drama.
              </p>

              <p className="text-gray-400 mb-8 text-sm md:text-base leading-relaxed">
                If you&apos;re on macOS and your favourite crunchy preset has been locked behind a
                broken 32‑bit GUI for years, OPENCRUSHER is here to quietly rescue your old sessions
                and give your new tracks the same unapologetic smack.
              </p>

              {/* CTA */}
              <div className="flex flex-wrap gap-4 items-center">
                <a
                  href="#download"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg btn-modern glow-purple"
                >
                  <Sparkles className="w-5 h-5" />
                  Get OPENCRUSHER — Free
                </a>
                <a
                  href="#open-source"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  Learn more
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>

            {/* Right: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 overflow-hidden">
                <Image
                  src="/images/shop/opencrusher-ui.png"
                  alt="OPENCRUSHER plugin interface screenshot"
                  width={701}
                  height={384}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Designed for Real‑World Sessions
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From quick mixbus crunch to brutal parallel drums, OPENCRUSHER gives you the classic
              sound without the vintage maintenance problems.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {OPENCRUSHER_FEATURES.map((feature, idx) => (
              <FeatureCard key={idx} feature={feature} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy / Tech */}
      <section
        id="open-source"
        className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent"
      >
        <div className="max-w-5xl mx-auto">
          <TechSection />
        </div>
      </section>

      {/* Download / CTA */}
      <section id="download" className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-modern rounded-2xl p-8 md:p-12 border-purple-500/30"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get OPENCRUSHER</h2>
          <p className="text-gray-400 mb-6">
            FREE distortion plugin. No dongle, no subscription, no email wall. When the public
            repository and builds are ready, this section will host the official downloads.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            In the meantime, you can follow the project on our channels and prepare your sessions –{' '}
            OPENCRUSHER is built to drop into the exact spots where you used to reach for
            CamelCrusher.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              disabled
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-gray-400 cursor-not-allowed"
            >
              Coming Soon – Builds & Repo
            </button>
          </div>
        </motion.div>
      </section>

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
