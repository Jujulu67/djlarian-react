'use client';

import { motion } from 'framer-motion';
import {
  Layers,
  Music,
  Settings2,
  Palette,
  Sparkles,
  Monitor,
  Download,
  Crown,
  Check,
  ChevronRight,
  Cpu,
  FileText,
  Zap,
  Waves,
  Grid3X3,
  CircleDot,
  Activity,
  ToggleLeft,
  CreditCard,
  Play,
  Pause,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSeamlessAudioLoop } from '@/hooks/useSeamlessAudioLoop';

// ============================================================================
// TYPES & DATA
// ============================================================================

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: string[];
}

interface ViewMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ShowcaseSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    icon: <Layers className="w-8 h-8" />,
    title: '5 Unique Views',
    description: 'Switch between OneKnob, Legacy, Modern, Crazy, and Draw views',
    details: [
      'OneKnob - Single macro for quick sound design (default)',
      'Legacy - Classic multi-knob controls',
      'Modern - Digital destruction tools (Bitcrush, Erosion)',
      'Crazy - XY morphing distortion',
      'Draw - Paint your own waveshaper',
    ],
  },
  {
    icon: <Music className="w-8 h-8" />,
    title: '27 Factory Presets',
    description: 'From subtle warmth to total destruction',
    details: [
      'Carefully crafted by sound designers',
      'Cover all genres and use cases',
      'Great starting points for your own sounds',
    ],
  },
  {
    icon: <Settings2 className="w-8 h-8" />,
    title: '3 LFOs + Custom Curves',
    description: 'Deep modulation system with 21 targets',
    details: [
      'Tempo sync or free running',
      'Custom drawable curves',
      'Envelope mode for one-shot modulation',
      'Retrigger on MIDI notes',
    ],
  },
  {
    icon: <Palette className="w-8 h-8" />,
    title: 'XY Morph Distortion',
    description: '4 algorithms blended via XY pad',
    details: ['Wavefolder', 'Bitcrush', 'Asymmetric Fuzz', 'Rectifier'],
  },
  {
    icon: <Grid3X3 className="w-8 h-8" />,
    title: 'Draw Canvas',
    description: 'Paint your own 32×32 waveshaper',
    details: [
      'SCAN mode - Grid modulates amplitude',
      'SHAPE mode - Custom transfer function',
      '12 random preset shapes',
    ],
  },
  {
    icon: <Monitor className="w-8 h-8" />,
    title: 'Cross-Platform',
    description: 'Native builds for macOS & Windows',
    details: ['macOS (AU, VST3)', 'Windows (VST3)'],
  },
];

const VIEW_MODES: ViewMode[] = [
  {
    id: 'oneknob',
    name: 'OneKnob',
    description: 'Single macro knob controls everything - perfect for quick sound design',
    icon: <CircleDot className="w-5 h-5" />,
  },
  {
    id: 'legacy',
    name: 'Legacy',
    description: 'Classic multi-knob interface with individual distortion controls',
    icon: <Settings2 className="w-5 h-5" />,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bitcrush, Erosion, Comb, Formant filters for digital destruction',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    id: 'crazy',
    name: 'Crazy',
    description: 'XY pad morphing between 4 distortion algorithms',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'draw',
    name: 'Draw',
    description: 'Paint your own waveshaper on a 32×32 canvas',
    icon: <Palette className="w-5 h-5" />,
  },
];

const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    id: 'lfo',
    title: 'LFO Modulation',
    description: '3 independent LFOs with tempo sync, custom curves, and 21 modulation targets',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: 'visualizer',
    title: 'Real-time Visualizer',
    description: 'See your waveform transform in real-time with the built-in oscilloscope',
    icon: <Waves className="w-5 h-5" />,
  },
];

const TECH_SPECS = [
  { label: 'Plugin Formats', value: 'VST3, AU', highlight: true },
  { label: 'Platforms', value: 'macOS 10.13+, Windows 10+', highlight: false },
  { label: 'Architecture', value: 'Apple Silicon + Intel, x64', highlight: false },
  { label: 'Technology', value: 'JUCE + WebView', highlight: true },
  { label: 'DAW Support', value: 'All major DAWs', highlight: false },
  { label: 'License', value: '1 user, 3 machines max', highlight: true },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function VersionBadge() {
  const [version, setVersion] = useState('v1.0.0');

  useEffect(() => {
    fetch('/api/plugin/version')
      .then((res) => res.json())
      .then((data) => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Keep fallback version
      });
  }, []);

  return (
    <div className="absolute -top-4 -right-4 px-3 py-1 rounded-full bg-purple-600 text-white text-sm font-bold">
      {version}
    </div>
  );
}

interface ShopSettings {
  stripePaymentLink: string;
  productPrice: number;
  shopEnabled: boolean;
  productName: string;
}

function useShopSettings(): ShopSettings {
  const [settings, setSettings] = useState<ShopSettings>({
    stripePaymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
    productPrice: 20,
    shopEnabled: true,
    productName: 'LarianCrusher',
  });

  useEffect(() => {
    fetch('/api/shop/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          stripePaymentLink:
            data.stripePaymentLink || process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '',
          productPrice: data.productPrice || 20,
          shopEnabled: data.shopEnabled !== false,
          productName: data.productName || 'LarianCrusher',
        });
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  return settings;
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-modern rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 group"
    >
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-gray-400 mb-4">{feature.description}</p>

      {feature.details && feature.details.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition-colors"
          >
            {isExpanded ? 'Show less' : 'Learn more'}
            <ChevronRight
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-2">
              {feature.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  {detail}
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

function ViewModeSelector() {
  const [activeView, setActiveView] = useState('oneknob');

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      {/* View tabs - equal width */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {VIEW_MODES.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`
              flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300
              ${
                activeView === view.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.name}</span>
          </button>
        ))}
      </div>

      {/* View content */}
      <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            {VIEW_MODES.find((v) => v.id === activeView)?.icon}
          </div>
          <h4 className="text-xl font-bold text-white mb-2">
            {VIEW_MODES.find((v) => v.id === activeView)?.name} View
          </h4>
          <p className="text-gray-400 max-w-md mx-auto">
            {VIEW_MODES.find((v) => v.id === activeView)?.description}
          </p>
          <p className="text-purple-400 text-sm mt-4">[GIF placeholder - Add your demo here]</p>
        </div>
      </div>
    </div>
  );
}

function ShowcaseSection() {
  const [activeSection, setActiveSection] = useState('lfo');

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      {/* Section tabs - equal width */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {SHOWCASE_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300
              ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {section.icon}
            {section.title}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            {SHOWCASE_SECTIONS.find((s) => s.id === activeSection)?.icon}
          </div>
          <h4 className="text-xl font-bold text-white mb-2">
            {SHOWCASE_SECTIONS.find((s) => s.id === activeSection)?.title}
          </h4>
          <p className="text-gray-400 max-w-md mx-auto">
            {SHOWCASE_SECTIONS.find((s) => s.id === activeSection)?.description}
          </p>
          <p className="text-purple-400 text-sm mt-4">[GIF placeholder - Add your demo here]</p>
        </div>
      </div>
    </div>
  );
}

const COMPARISON_MODES = [
  { id: 'medium', label: 'Medium', description: 'Standard balanced saturation' },
  { id: 'hard', label: 'Hard', description: 'OneKnob pushed to 100% saturation' },
  {
    id: 'very_hard',
    label: 'Very Hard',
    description: 'Multiple modules active with deep clipping',
  },
  { id: 'creative', label: 'Creative', description: 'Extreme modulation with active LFO curves' },
];

function BeforeAfterSection() {
  const [gainMatch, setGainMatch] = useState(true);
  const [activeMode, setActiveMode] = useState('medium');
  const [playingType, setPlayingType] = useState<'original' | 'processed' | null>(null);

  // List all audio files to preload
  const audioFiles = useMemo(
    () => [
      'dry.wav',
      'dry_norm.wav',
      'medium.wav',
      'medium_norm.wav',
      'hard.wav',
      'hard_norm.wav',
      'very_hard.wav',
      'very_hard_norm.wav',
      'creative.wav',
      'creative_norm.wav',
    ],
    []
  );

  const { isLoaded, isPlaying, currentFile, play, stop, switchTo } = useSeamlessAudioLoop({
    basePath: '/audio/shop/lariancrusher',
    files: audioFiles,
    crossfadeDuration: 0.01, // 10ms micro-fade just to avoid clicks
  });

  // Get the correct file name based on state
  const getFileName = (type: 'original' | 'processed') => {
    const modeSuffix = type === 'processed' ? activeMode : 'dry';
    const gainSuffix = gainMatch ? '_norm' : '';
    return `${modeSuffix}${gainSuffix}.wav`;
  };

  // Handle mode or gain match changes while playing
  useEffect(() => {
    if (playingType && isPlaying) {
      const targetFile = getFileName(playingType);
      if (currentFile !== targetFile) {
        switchTo(targetFile);
      }
    }
  }, [activeMode, gainMatch, playingType, isPlaying, currentFile, switchTo]);

  const togglePlay = (type: 'original' | 'processed') => {
    if (playingType === type) {
      // Stop playback
      stop();
      setPlayingType(null);
    } else {
      // Start or switch playback
      const targetFile = getFileName(type);
      if (isPlaying) {
        switchTo(targetFile);
      } else {
        play(targetFile);
      }
      setPlayingType(type);
    }
  };

  return (
    <div className="glass-modern rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h3 className="text-2xl font-bold text-white">Hear the Difference</h3>
        <button
          onClick={() => setGainMatch(!gainMatch)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 self-start md:self-auto ${
            gainMatch ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white'
          }`}
        >
          <ToggleLeft className={`w-5 h-5 transition-transform ${gainMatch ? 'rotate-180' : ''}`} />
          Gain Match {gainMatch ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Mode Selector - Tabs Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {COMPARISON_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`
                            px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300
                            ${
                              activeMode === mode.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }
                        `}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Mode Description Area */}
      <div className="text-center mb-8 px-4">
        <p className="text-gray-400 text-sm animate-in fade-in slide-in-from-top-1 duration-500">
          <span className="text-purple-400 font-semibold mr-2">
            {COMPARISON_MODES.find((m) => m.id === activeMode)?.label}:
          </span>
          {COMPARISON_MODES.find((m) => m.id === activeMode)?.description}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original */}
        <div
          onClick={() => togglePlay('original')}
          className={`bg-black/50 rounded-xl p-6 text-center group transition-all duration-300 cursor-pointer hover:bg-black/70 border-2 ${playingType === 'original' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-transparent'}`}
        >
          <div className="aspect-[3/1] bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-lg mb-4 flex items-center justify-center border border-white/5">
            <Waves
              className={`w-10 h-10 transition-all duration-300 ${playingType === 'original' ? 'text-purple-400 scale-110' : 'text-gray-400 group-hover:scale-110'}`}
            />
          </div>
          <h4 className="text-white font-semibold text-lg mb-1">Original Signal</h4>
          <p className="text-gray-500 text-sm italic">Clean reference input</p>
          <div className="text-purple-400 text-xs mt-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
            {playingType === 'original' ? (
              <>
                <Pause className="w-4 h-4" /> Playing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Listen Original
              </>
            )}
          </div>
        </div>

        {/* Processed */}
        <div
          onClick={() => togglePlay('processed')}
          className={`bg-black/50 rounded-xl p-6 text-center group transition-all duration-300 cursor-pointer hover:bg-black/70 border-2 overflow-hidden relative ${playingType === 'processed' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-transparent'}`}
        >
          <div
            className={`aspect-[3/1] rounded-lg mb-4 flex items-center justify-center transition-all duration-500 border border-white/10 ${
              gainMatch
                ? 'bg-gradient-to-r from-green-700/40 to-emerald-600/40 active-glow-green'
                : 'bg-gradient-to-r from-purple-700/40 to-blue-600/40 active-glow-purple'
            }`}
          >
            <Waves
              className={`w-10 h-10 transition-all duration-500 ${playingType === 'processed' ? 'scale-110' : 'group-hover:scale-110'} ${gainMatch ? 'text-green-400' : 'text-purple-400'} ${activeMode === 'creative' || playingType === 'processed' ? 'animate-pulse' : ''}`}
            />
          </div>
          <h4 className="text-white font-semibold text-lg mb-1">
            Processed{' '}
            <span className="text-purple-400 ml-1">
              [{COMPARISON_MODES.find((m) => m.id === activeMode)?.label}]
            </span>
          </h4>
          <p className="text-gray-400 text-sm italic">
            {gainMatch ? 'Gain matched' : 'Raw output'}
          </p>
          <div className="text-purple-400 text-xs mt-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
            {playingType === 'processed' ? (
              <>
                <Pause className="w-4 h-4" /> Playing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Preview Sound
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TechSpecsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-modern rounded-2xl p-6 md:p-8 border-purple-500/20"
    >
      <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Cpu className="w-6 h-6 text-purple-400" />
        </div>
        Technical Specifications
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECH_SPECS.map((spec, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl transition-all duration-300 ${
              spec.highlight
                ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20'
                : 'bg-white/5'
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">{spec.label}</p>
            <p className={`font-semibold ${spec.highlight ? 'text-white' : 'text-gray-200'}`}>
              {spec.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LarianCrusherPage() {
  const shopSettings = useShopSettings();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-black to-blue-900/40 animate-gradient-shift bg-[length:200%_200%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-600/30 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4">
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

          <div className="grid md:grid-cols-2 gap-12 items-center">
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
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-purple-500/20 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-16 h-16 text-purple-400" />
                  </div>
                  <p className="text-gray-400">[Plugin screenshot or GIF]</p>
                  <p className="text-purple-400 text-sm mt-2">Add your demo media here</p>
                </div>
              </div>

              {/* Floating badge - dynamic version */}
              <VersionBadge />
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
