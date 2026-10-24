import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { Feature } from './types';

export function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-modern rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 group h-full md:min-h-[220px] lg:min-h-[240px] flex flex-col cursor-pointer"
      onClick={() => {
        if (feature.details && feature.details.length > 0) {
          setIsExpanded((prev) => !prev);
        }
      }}
    >
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-gray-400 mb-4">{feature.description}</p>

      {feature.details && feature.details.length > 0 && (
        <div className="mt-auto pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
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
        </div>
      )}
    </motion.div>
  );
}
