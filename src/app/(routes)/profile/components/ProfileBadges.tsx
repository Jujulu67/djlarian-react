'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';
import type { Badge } from '../utils/badgeCalculations';

interface ProfileBadgesProps {
  unlockedBadges: Badge[];
  lockedBadges: Badge[];
  totalBadges: number;
  unlockedSecretBadges?: Badge[];
  unlockedSecretCount?: number;
}

export function ProfileBadges({
  unlockedBadges,
  lockedBadges,
  totalBadges,
  unlockedSecretBadges = [],
  unlockedSecretCount = 0,
}: ProfileBadgesProps) {
  // Générer les delays de manière déterministe pour éviter Math.random() dans le render
  const badgeDelays = useMemo(() => {
    return unlockedBadges.map((_, index) => (index * 0.1) % 0.5);
  }, [unlockedBadges]);

  const secretBadgeDelays = useMemo(() => {
    return unlockedSecretBadges.map((_, index) => (index * 0.1) % 0.5);
  }, [unlockedSecretBadges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="h-full"
    >
      <div
        className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-3 h-full flex flex-col overflow-visible"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-4">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
            <Award size={18} className="sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white">Badges</h2>
            <p className="text-xs sm:text-sm lg:text-xs text-gray-400">
              {unlockedBadges.length} / {totalBadges} débloqués
              {unlockedSecretCount > 0 && (
                <span className="text-amber-400 ml-1">+ {unlockedSecretCount} secrets</span>
              )}
            </p>
          </div>
        </div>

        {/* Badges débloqués */}
        {unlockedBadges.length > 0 && (
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-2">
              {unlockedBadges.map((badge, index) => {
                const Icon = badge.icon;
                const delay = badgeDelays[index] ?? 0;
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.15 }}
                    className="relative group z-10 hover:z-50"
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
                        className="w-full h-full flex items-center justify-center"
                        animate={{
                          y: [0, -2, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay,
                        }}
                      >
                        <img
                          src={badge.image}
                          alt={badge.name}
                          className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300 relative z-10"
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

        {/* Badges secrets débloqués */}
        {unlockedSecretBadges.length > 0 && (
          <div className="pt-4 mt-4 border-t border-white/10 -mx-3 sm:-mx-4 lg:-mx-3 px-3 sm:px-4 lg:px-3">
            <div className="flex items-center gap-2 mb-2 lg:mb-2">
              <Sparkles size={14} className="text-amber-400" />
              <p className="text-xs sm:text-sm lg:text-xs text-amber-400 font-semibold">
                Badges Secrets
              </p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-2">
              {unlockedSecretBadges.map((badge, index) => {
                const Icon = badge.icon;
                const delay = secretBadgeDelays[index] ?? 0;
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.15 }}
                    className="relative group z-10 hover:z-50"
                  >
                    <div
                      className={`aspect-square rounded-xl ${badge.gradient} border-2 border-amber-500/50 flex flex-col items-center justify-center p-1.5 sm:p-2 lg:p-1.5 cursor-pointer transition-all hover:border-amber-400/80 hover:shadow-lg hover:shadow-amber-500/30 relative overflow-hidden`}
                    >
                      {/* Effet shimmer spécial doré */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      </div>

                      {/* Icône avec animation subtile */}
                      <motion.div
                        className="w-full h-full flex items-center justify-center"
                        animate={{
                          y: [0, -2, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay,
                        }}
                      >
                        <img
                          src={badge.image}
                          alt={badge.name}
                          className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] transition-all duration-300 relative z-10"
                        />
                      </motion.div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-black/95 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap border border-amber-500/50 shadow-2xl shadow-amber-500/20">
                        <div className="flex items-center gap-1 font-semibold mb-0.5 text-amber-400">
                          <Sparkles size={10} />
                          {badge.name}
                        </div>
                        <div className="text-gray-200">{badge.description}</div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-2 h-2 bg-black/95 border-r border-b border-amber-500/50 rotate-45"></div>
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
          <div className="pt-4 mt-4 border-t border-white/10 -mx-3 sm:-mx-4 lg:-mx-3 px-3 sm:px-4 lg:px-3">
            <p className="text-xs sm:text-sm lg:text-xs text-gray-500 mb-2 lg:mb-2">À débloquer</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-2">
              {lockedBadges.slice(0, 8).map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="relative group aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-1.5 sm:p-2 lg:p-1.5 opacity-60 hover:opacity-80 transition-opacity cursor-help"
                  >
                    <img
                      src={badge.image}
                      alt={badge.name}
                      className="w-full h-full object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                    {/* Tooltip pour badge verrouillé */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-black/95 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap border border-gray-600/50 shadow-2xl">
                        <div className="font-semibold mb-0.5 text-gray-300">{badge.name}</div>
                        <div className="text-amber-400/90 text-[10px]">🔒 {badge.hint}</div>
                      </div>
                      {/* Flèche du tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-2 h-2 bg-black/95 border-r border-b border-gray-600/50 rotate-45"></div>
                      </div>
                    </div>
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
      </div>
    </motion.div>
  );
}
