import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';

import type { Feature } from './types';

export function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isV2 = useUiVersion() === 'v2';
  const spotlight = useSpotlight<HTMLDivElement>();

  // v2 : l'apparition est gérée par le RevealGroup de la page, et la carte quitte
  // `glass-modern` (règle non-layerisée qui écraserait surface-1 et le survol)
  const motionProps = isV2
    ? {}
    : {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5, delay: index * 0.1 },
      };

  return (
    <motion.div
      {...motionProps}
      {...(isV2 ? spotlight : {})}
      className={
        isV2
          ? 'group spotlight surface-1 flex h-full cursor-pointer flex-col rounded-2xl p-6 transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/15 md:min-h-[220px] lg:min-h-[240px]'
          : 'glass-modern rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 group h-full md:min-h-[220px] lg:min-h-[240px] flex flex-col cursor-pointer'
      }
      onClick={() => {
        if (feature.details && feature.details.length > 0) {
          setIsExpanded((prev) => !prev);
        }
      }}
    >
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300 v2:mb-5 v2:inline-flex v2:w-fit v2:rounded-xl v2:bg-white/[0.04] v2:p-2.5 v2:text-purple-300 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:group-hover:scale-100 v2:[&_svg]:h-6 v2:[&_svg]:w-6">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2 v2:text-lg v2:font-semibold">
        {feature.title}
      </h3>
      <p className="text-gray-400 mb-4 v2:text-white/60">{feature.description}</p>

      {feature.details && feature.details.length > 0 && (
        <div className="mt-auto pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            aria-expanded={isExpanded}
            className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition-colors v2:font-medium v2:text-purple-300 v2:hover:text-white"
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
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-300 v2:text-white/70"
                >
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  {detail}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
