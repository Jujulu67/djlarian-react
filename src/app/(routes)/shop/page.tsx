'use client';

import { motion } from 'framer-motion';
import {
  Zap,
  Palette,
  Music,
  AudioWaveform,
  Layers,
  Settings2,
  Sparkles,
  Download,
  Github,
  Crown,
  Check,
  X,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ProductFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  priceSubtext?: string;
  badge: 'FREE' | 'PRO';
  features: ProductFeature[];
  ctaText: string;
  ctaHref: string;
  isHighlighted?: boolean;
}

// ============================================================================
// PRODUCT DATA
// ============================================================================

const PRODUCTS: Product[] = [
  {
    id: 'opencrusher',
    name: 'OPENCRUSHER',
    tagline: 'Open-Source Distortion',
    description:
      'A free, open-source distortion plugin for everyone. Perfect for getting started with creative sound design.',
    price: 'Free',
    priceSubtext: 'Forever',
    badge: 'FREE',
    features: [
      {
        icon: <Zap className="w-5 h-5" />,
        title: 'Basic Distortion',
        description: 'Tube & Mechanical modes',
      },
      {
        icon: <AudioWaveform className="w-5 h-5" />,
        title: 'Simple Filter',
        description: 'Lowpass with resonance',
      },
      {
        icon: <Github className="w-5 h-5" />,
        title: 'Open Source',
        description: 'Contribute & learn',
      },
    ],
    ctaText: 'Learn More',
    ctaHref: '/shop/opencrusher',
    isHighlighted: false,
  },
  {
    id: 'lariancrusher',
    name: 'LarianCrusher',
    tagline: 'Professional Multi-Mode Distortion',
    description:
      'The ultimate distortion & sound design plugin. 6 views, 27 presets, advanced modulation, and a modern WebView UI.',
    price: '€20',
    priceSubtext: 'Lifetime license',
    badge: 'PRO',
    features: [
      {
        icon: <Layers className="w-5 h-5" />,
        title: '6 View Modes',
        description: 'Pro, OneKnob, Legacy, Modern, Crazy, Draw',
      },
      {
        icon: <Music className="w-5 h-5" />,
        title: '27 Factory Presets',
        description: 'From subtle warmth to chaos',
      },
      {
        icon: <Settings2 className="w-5 h-5" />,
        title: '3 LFOs + Custom Curves',
        description: 'Deep modulation system',
      },
      {
        icon: <Palette className="w-5 h-5" />,
        title: 'XY Morph & Draw Canvas',
        description: 'Paint your own waveshaper',
      },
      {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Modern WebView UI',
        description: 'Sleek, responsive interface',
      },
    ],
    ctaText: 'Learn More',
    ctaHref: '/shop/lariancrusher',
    isHighlighted: true,
  },
];

// Feature comparison data
const COMPARISON_FEATURES = [
  { name: 'Tube Saturation', free: true, pro: true },
  { name: 'Mechanical Clipping', free: true, pro: true },
  { name: 'Lowpass Filter', free: true, pro: true },
  { name: 'Factory Presets', free: '5', pro: '27' },
  { name: 'LFO Modulation', free: false, pro: '3 LFOs' },
  { name: 'Custom LFO Curves', free: false, pro: true },
  { name: 'Modern View (Bitcrush, Erosion)', free: false, pro: true },
  { name: 'Crazy View (XY Morph)', free: false, pro: true },
  { name: 'Draw View (Canvas Waveshaper)', free: false, pro: true },
  { name: 'Compressor + Width', free: false, pro: true },
  { name: 'Comb & Formant Filters', free: false, pro: true },
  { name: 'WebView Pro Interface', free: false, pro: true },
  { name: 'Cross-Platform (Win/Mac/Linux)', free: true, pro: true },
  { name: 'Updates', free: 'Community', pro: 'Lifetime' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function ProductCard({ product }: { product: Product }) {
  const isPro = product.badge === 'PRO';
  const isDisabled = !product.ctaHref || product.ctaHref === '#';
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`
        relative overflow-hidden rounded-2xl h-full cursor-pointer
        ${isPro ? 'glass-modern border-purple-500/30' : 'glass-modern border-white/10'}
        ${isPro ? 'shadow-xl shadow-purple-500/10' : 'shadow-lg'}
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-2xl
        ${isPro ? 'hover:shadow-purple-500/20 hover:border-purple-400/50' : 'hover:border-white/20'}
      `}
      onClick={() => {
        if (!isDisabled && product.ctaHref) {
          router.push(product.ctaHref);
        }
      }}
      role="button"
      aria-label={`Open details for ${product.name}`}
    >
      {/* Pro glow effect */}
      {isPro && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10 pointer-events-none" />
      )}

      <div className="relative p-6 md:p-8 flex flex-col h-full">
        {/* Badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
              ${isPro ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white/10 text-gray-300 border border-white/20'}
            `}
          >
            {isPro && <Crown className="w-3 h-3 inline mr-1" />}
            {product.badge}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`text-2xl md:text-3xl font-bold mb-2 ${isPro ? 'text-gradient-animated' : 'text-white'}`}
        >
          {product.name}
        </h3>
        <p className="text-gray-400 text-sm mb-4">{product.tagline}</p>

        {/* Description */}
        <p className="text-gray-300 mb-6 leading-relaxed">{product.description}</p>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {product.features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <div
                className={`
                  p-2 rounded-lg shrink-0
                  ${isPro ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-400'}
                `}
              >
                {feature.icon}
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{feature.title}</h4>
                <p className="text-gray-500 text-xs">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          {/* Price */}
          <div>
            <span className={`text-4xl font-bold ${isPro ? 'text-white' : 'text-gray-300'}`}>
              {product.price}
            </span>
            {product.priceSubtext && (
              <span className="text-gray-500 text-sm ml-2">{product.priceSubtext}</span>
            )}
          </div>

          {/* CTA Button */}
          <a
            href={product.ctaHref}
            className={`
              w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold
              transition-all duration-300
              ${
                isDisabled
                  ? 'border-2 border-white/20 text-gray-300 hover:border-white/40 hover:text-white cursor-not-allowed opacity-60'
                  : isPro
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white glow-purple btn-modern'
                    : 'border-2 border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
              }
            `}
            onClick={
              isDisabled
                ? (e) => {
                    e.preventDefault();
                  }
                : undefined
            }
          >
            <Download className="w-5 h-5" />
            {product.ctaText}
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function FeatureComparison() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="glass-modern rounded-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-white/10">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Compare Features</h2>
        <p className="text-gray-400 mt-2">See what&apos;s included in each version</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
              <th className="text-center p-4 text-gray-400 font-medium w-32">OPENCRUSHER</th>
              <th className="text-center p-4 font-medium w-32">
                <span className="text-gradient">LarianCrusher</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature, idx) => (
              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-gray-300">{feature.name}</td>
                <td className="p-4 text-center">
                  {feature.free === true ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : feature.free === false ? (
                    <X className="w-5 h-5 text-gray-600 mx-auto" />
                  ) : (
                    <span className="text-gray-400 text-sm">{feature.free}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {feature.pro === true ? (
                    <Check className="w-5 h-5 text-purple-500 mx-auto" />
                  ) : (
                    <span className="text-purple-400 text-sm font-medium">{feature.pro}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ShopPage() {
  const { data: session } = useSession();
  const [shopEnabled, setShopEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetch('/api/shop/settings')
      .then((res) => res.json())
      .then((data) => {
        setShopEnabled(data.shopEnabled !== false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Show loading state to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show disabled message for non-admins
  if (!shopEnabled && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-modern p-12 rounded-2xl max-w-md mx-4">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Boutique Indisponible</h1>
          <p className="text-gray-400 mb-6">
            La boutique est temporairement fermée. Revenez bientôt !
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Admin preview banner */}
      {!shopEnabled && isAdmin && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-yellow-300 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Mode aperçu admin - La boutique est désactivée pour les visiteurs
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-blue-900/30 animate-gradient-shift bg-[length:200%_200%]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-gradient-animated">Audio Plugins</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Professional distortion and sound design tools for music producers
            </p>
          </motion.div>

          {/* Products Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <FeatureComparison />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-modern rounded-2xl p-8 md:p-12"
        >
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to crush some sounds?
          </h2>
          <p className="text-gray-400 mb-8">
            Get LarianCrusher today and unlock the full potential of your productions.
          </p>
          <a
            href="/shop/lariancrusher"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg btn-modern glow-purple animate-glow-pulse"
          >
            <Crown className="w-5 h-5" />
            Get LarianCrusher Pro
          </a>
        </motion.div>
      </section>
    </div>
  );
}
