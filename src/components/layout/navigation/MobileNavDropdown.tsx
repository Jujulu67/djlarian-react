'use client';

import type { NavLink } from './navigationConfig';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { useUiVersion } from '@/hooks/useUiVersion';

interface MobileNavDropdownProps {
  isMobileMenuOpen: boolean;
  links: NavLink[];
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function MobileNavDropdown({
  isMobileMenuOpen,
  links,
  setIsMobileMenuOpen,
}: MobileNavDropdownProps) {
  const isV3 = useUiVersion() === 'v3';
  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: 'auto',
            transition: {
              height: { duration: 0.3 },
              opacity: { duration: 0.2 },
            },
          }}
          exit={{
            opacity: 0,
            height: 0,
            transition: {
              height: { duration: 0.3 },
              opacity: { duration: 0.1 },
            },
          }}
          id="mobile-nav"
          className="lg:hidden mobile-menu bg-black/95 backdrop-blur-md border-b border-purple-500/20 overflow-hidden rounded-b-2xl v2:border-b-0 v2:border-t v2:border-white/10 v2:bg-transparent v2:backdrop-blur-none v3:rounded-none v3:bg-[rgb(5_5_6/0.97)]"
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          <div
            className="container mx-auto px-4 py-4 flex flex-col space-y-3 v2:space-y-1 v2:py-3 v3:min-h-[calc(100svh-4rem)] v3:space-y-0 v3:pt-8"
            style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
          >
            {links.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.15 }}
              >
                <Link
                  href={link.href}
                  className="text-white/90 hover:text-white py-2 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset rounded v2:gap-3 v2:rounded-2xl v2:px-3 v2:py-3 v2:text-lg v2:font-medium v2:hover:bg-white/[0.06] v3:items-baseline v3:gap-4 v3:rounded-none v3:px-0 v3:py-2 v3:text-display v3:text-[2.75rem] v3:rule-b v3:hover:bg-transparent v3:hover:text-[rgb(var(--signal))]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon && <link.icon size={18} className="text-purple-400 v3:hidden" />}
                  {/* v3 : numéro de piste devant chaque lien */}
                  <span className="hidden font-mono-signal text-xs font-normal tracking-normal text-[rgb(var(--signal))] v3:inline">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {isV3 ? (link.labelFr ?? link.label) : link.label}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
