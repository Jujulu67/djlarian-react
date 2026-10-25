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
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';
import { cn } from '@/lib/utils/cn';

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

  const openDetails = () => {
    if (!isDisabled && product.ctaHref) {
      router.push(product.ctaHref);
    }
  };

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
      onClick={openDetails}
      onKeyDown={(event) => {
        // Accessibilité clavier : la carte se comporte comme un bouton (Entrée / Espace)
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetails();
        }
      }}
      role="button"
      tabIndex={0}
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
// UI V2
// ============================================================================

/** Carte produit v2 : toute la carte est un lien (clavier inclus), CTA purement visuel */
function ProductCardV2({ product }: { product: Product }) {
  const isPro = product.badge === 'PRO';
  const spotlight = useSpotlight<HTMLAnchorElement>();

  return (
    <Link
      href={product.ctaHref}
      aria-label={`${product.name} : ${product.tagline}`}
      className="group spotlight surface-1 relative flex h-full flex-col rounded-2xl p-6 transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.99] md:p-8"
      {...spotlight}
    >
      <div className="mb-5 flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset',
            isPro
              ? 'bg-brand/15 text-purple-200 ring-brand/30'
              : 'bg-white/[0.04] text-white/70 ring-white/10'
          )}
        >
          {isPro && <Crown className="h-3 w-3" aria-hidden="true" />}
          {product.badge}
        </span>
      </div>

      <h2 className="text-display mb-2 text-2xl text-white md:text-3xl">{product.name}</h2>
      <p className="mb-4 text-sm text-white/50">{product.tagline}</p>
      <p className="mb-6 leading-relaxed text-white/70">{product.description}</p>

      <ul className="mb-8 space-y-3">
        {product.features.map((feature) => (
          <li key={feature.title} className="flex items-start gap-3">
            <span className="shrink-0 rounded-lg bg-white/[0.04] p-2 text-purple-300 ring-1 ring-inset ring-white/10">
              {feature.icon}
            </span>
            <span>
              <span className="block text-sm font-medium text-white">{feature.title}</span>
              <span className="block text-xs text-white/50">{feature.description}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-4">
        <div>
          <span className="text-4xl font-semibold text-white">{product.price}</span>
          {product.priceSubtext && (
            <span className="ml-2 text-sm text-white/50">{product.priceSubtext}</span>
          )}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: isPro ? 'default' : 'outline', size: 'lg' }),
            'w-full'
          )}
        >
          <Download className="h-5 w-5" />
          {product.ctaText}
        </span>
      </div>
    </Link>
  );
}

function ComparisonCell({ value, isPro }: { value: boolean | string; isPro: boolean }) {
  if (value === true) {
    return (
      <Check
        className={cn('mx-auto h-5 w-5', isPro ? 'text-brand' : 'text-white/70')}
        aria-label="Inclus"
      />
    );
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-white/20" aria-label="Non inclus" />;
  }
  return (
    <span className={cn('text-sm', isPro ? 'font-medium text-purple-300' : 'text-white/60')}>
      {value}
    </span>
  );
}

function FeatureComparisonV2() {
  return (
    <div className="surface-1 overflow-hidden rounded-2xl">
      <div className="border-b border-white/[0.06] p-6 md:p-8">
        <h2 className="text-display text-2xl text-white md:text-3xl">Compare Features</h2>
        <p className="mt-2 text-white/60">See what&apos;s included in each version</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-white/50 md:p-4">
                Feature
              </th>
              <th className="w-28 p-3 text-center text-xs font-medium uppercase tracking-wider text-white/50 md:w-36 md:p-4">
                OPENCRUSHER
              </th>
              <th className="w-28 p-3 text-center text-xs font-medium uppercase tracking-wider text-white md:w-36 md:p-4">
                LarianCrusher
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature) => (
              <tr
                key={feature.name}
                className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="p-3 text-sm text-white/70 md:p-4 md:text-base">{feature.name}</td>
                <td className="p-3 text-center md:p-4">
                  <ComparisonCell value={feature.free} isPro={false} />
                </td>
                <td className="p-3 text-center md:p-4">
                  <ComparisonCell value={feature.pro} isPro />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShopPageV2() {
  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-16 md:pb-24 md:pt-24">
        <PageHeader
          eyebrow="Boutique"
          title="Audio Plugins"
          description="Professional distortion and sound design tools for music producers"
        />

        <RevealGroup className="grid gap-6 md:grid-cols-2">
          {PRODUCTS.map((product) => (
            <RevealItem key={product.id} className="h-full">
              <ProductCardV2 product={product} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-16 md:pb-24">
        <Reveal>
          <FeatureComparisonV2 />
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-16 md:pb-24">
        <Reveal className="surface-1 mx-auto max-w-3xl rounded-2xl p-8 text-center md:p-12">
          <h2 className="text-display mb-4 text-2xl text-white md:text-4xl">
            Ready to crush some sounds?
          </h2>
          <p className="mb-8 text-white/60">
            Get LarianCrusher today and unlock the full potential of your productions.
          </p>
          <Button asChild size="lg">
            <Link href="/shop/lariancrusher">
              <Crown className="h-5 w-5" />
              Get LarianCrusher Pro
            </Link>
          </Button>
        </Reveal>
      </section>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ShopPage() {
  const isV2 = useUiVersion() === 'v2';
  if (isV2) return <ShopPageV2 />;

  return (
    <div className="min-h-screen">
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
