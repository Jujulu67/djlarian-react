'use client';

import type { NavLink } from './navigationConfig';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

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
          className="lg:hidden mobile-menu bg-black/95 backdrop-blur-md border-b border-purple-500/20 overflow-hidden rounded-b-2xl"
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          <div
            className="container mx-auto px-4 py-4 flex flex-col space-y-3"
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
                  className="text-white/90 hover:text-white py-2 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset rounded"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon && <link.icon size={18} className="text-purple-400" />}
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
