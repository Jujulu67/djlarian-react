'use client';

import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import type { Badge } from '../utils/badgeCalculations';

interface ProfileBadgesProps {
  unlockedBadges: Badge[];
  lockedBadges: Badge[];
  totalBadges: number;
}

export function ProfileBadges({ unlockedBadges, lockedBadges, totalBadges }: ProfileBadgesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-3 lift-3d h-full flex flex-col"
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-4">
        <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
          <Award size={18} className="sm:w-5 sm:h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white">Badges</h2>
          <p className="text-xs sm:text-sm lg:text-xs text-gray-400">
            {unlockedBadges.length} / {totalBadges} débloqués
          </p>
        </div>
      </div>

      {/* Badges débloqués */}
      {unlockedBadges.length > 0 && (
        <div className="mb-3 lg:mb-2">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-2">
            {unlockedBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15, z: 10 }}
                  className="relative group"
                >
                  <div
                    className={`aspect-square rounded-xl ${badge.gradient} border-2 border-purple-500/30 flex flex-col items-center justify-center p-1.5 sm:p-2 lg:p-1.5 cursor-pointer transition-all hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 relative overflow-hidden`}
                  >
                    {/* Effet shimmer animé */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
                        style={{
                          animation: 'shimmer 3s ease-in-out infinite',
                        }}
                      />
                    </div>

                    {/* Effet de glow pulsant */}
                    <motion.div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r ${badge.color} opacity-0 group-hover:opacity-20`}
                      animate={{
                        opacity: [0, 0.1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />

                    {/* Icône avec animation subtile */}
                    <motion.div
                      animate={{
                        y: [0, -2, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: Math.random() * 0.5,
                      }}
                    >
                      <Icon
                        size={20}
                        className={`sm:w-6 sm:h-6 lg:w-5 lg:h-5 relative z-10 ${badge.iconColor} drop-shadow-lg filter group-hover:drop-shadow-[0_0_8px_currentColor] transition-all duration-300`}
                      />
                    </motion.div>

                    {/* Overlay au hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 rounded-xl transition-all" />

                    {/* Particules brillantes */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <motion.div
                        className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full"
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 0,
                        }}
                      />
                      <motion.div
                        className="absolute top-2 right-2 w-1 h-1 bg-white rounded-full"
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 0.5,
                        }}
                      />
                      <motion.div
                        className="absolute bottom-2 left-2 w-1 h-1 bg-white rounded-full"
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 1,
                        }}
                      />
                    </div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-black/95 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap border border-purple-500/50 shadow-2xl shadow-purple-500/20">
                      <div className="font-semibold mb-0.5 text-white">{badge.name}</div>
                      <div className="text-gray-200">{badge.description}</div>
                    </div>
                    {/* Flèche du tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="w-2 h-2 bg-black/95 border-r border-b border-purple-500/50 rotate-45"></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges verrouillés (optionnel, affichés en gris) */}
      {lockedBadges.length > 0 && unlockedBadges.length > 0 && (
        <div className="pt-3 lg:pt-2 border-t border-white/10">
          <p className="text-xs sm:text-sm lg:text-xs text-gray-500 mb-2 lg:mb-1.5">À débloquer</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-2">
            {lockedBadges.slice(0, 8).map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-1.5 sm:p-2 lg:p-1.5 opacity-40"
                >
                  <Icon size={20} className="sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-gray-500" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message si aucun badge */}
      {unlockedBadges.length === 0 && (
        <div className="text-center py-6">
          <Award size={40} className="mx-auto mb-3 text-gray-500" />
          <p className="text-sm sm:text-base text-gray-400 mb-1">
            Aucun badge débloqué pour le moment
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Créez des projets pour débloquer vos premiers badges !
          </p>
        </div>
      )}
    </motion.div>
  );
}
