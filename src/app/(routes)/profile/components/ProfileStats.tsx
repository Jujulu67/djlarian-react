'use client';

import { motion } from 'framer-motion';
import { FolderKanban, TrendingUp, Award, User } from 'lucide-react';
import type { UserStats } from '../hooks/useProfileStats';

interface ProfileStatsProps {
  stats: UserStats;
  isLoading: boolean;
}

export function ProfileStats({ stats, isLoading }: ProfileStatsProps) {
  const userStats = [
    {
      label: 'Projets',
      value: isLoading ? '...' : stats.projects.toString(),
      icon: FolderKanban,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'En cours',
      value: isLoading ? '...' : stats.projectsEnCours.toString(),
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Terminés',
      value: isLoading ? '...' : stats.projectsTermines.toString(),
      icon: Award,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Membre',
      value: 'Actif',
      icon: User,
      color: 'from-purple-500 to-blue-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-4 sm:mb-6 lg:mb-6 items-stretch"
    >
      {userStats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          whileHover={{ scale: 1.05, y: -5 }}
          className="glass-modern glass-modern-hover rounded-xl p-3 sm:p-4 lg:p-3 text-center lift-3d h-full flex flex-col justify-center items-center"
        >
          <div
            className={`inline-flex p-1.5 sm:p-2 lg:p-1.5 rounded-lg bg-gradient-to-r ${stat.color} mb-1.5 sm:mb-2 lg:mb-1.5`}
          >
            <stat.icon size={18} className="sm:w-5 sm:h-5 lg:w-4 lg:h-4 text-white" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-xl font-bold text-white mb-0.5">
            {stat.value}
          </div>
          <div className="text-xs sm:text-sm lg:text-xs text-gray-400">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
