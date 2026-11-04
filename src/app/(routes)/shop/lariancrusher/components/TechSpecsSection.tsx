import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';

import { TECH_SPECS } from './constants';

export function TechSpecsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-modern rounded-2xl p-6 md:p-8 border-purple-500/20"
    >
      <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 v2:text-display v2:font-normal">
        <div className="p-2 rounded-lg bg-purple-500/20 v2:rounded-xl v2:bg-white/[0.04] v2:ring-1 v2:ring-inset v2:ring-white/10">
          <Cpu className="w-6 h-6 text-purple-400 v2:h-5 v2:w-5 v2:text-purple-300" />
        </div>
        Technical Specifications
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECH_SPECS.map((spec, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl transition-all duration-300 ${
              spec.highlight
                ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 v2:bg-none v2:bg-brand/[0.06] v2:border-brand/20'
                : 'bg-white/5 v2:bg-white/[0.03] v2:ring-1 v2:ring-inset v2:ring-white/[0.06]'
            }`}
          >
            <p className="text-gray-400 text-sm mb-1 v2:text-white/50">{spec.label}</p>
            <p className={`font-semibold ${spec.highlight ? 'text-white' : 'text-gray-200'}`}>
              {spec.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
