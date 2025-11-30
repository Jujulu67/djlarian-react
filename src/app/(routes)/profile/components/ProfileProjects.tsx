'use client';

import { motion } from 'framer-motion';
import { FolderKanban, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectStatus } from '@/components/projects/types';
import type { RecentProject } from '../hooks/useRecentProjects';

interface ProfileProjectsProps {
  projects: number;
  recentProjects: RecentProject[];
  isLoading: boolean;
  userName?: string | null;
}

export function ProfileProjects({
  projects,
  recentProjects,
  isLoading,
  userName,
}: ProfileProjectsProps) {
  // Message d'accueil pour nouveaux utilisateurs
  if (projects === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-4 lift-3d mb-4 lg:mb-5"
      >
        <div className="text-center">
          <FolderKanban
            size={40}
            className="sm:w-12 sm:h-12 lg:w-10 lg:h-10 mx-auto mb-3 lg:mb-2 text-purple-400"
          />
          <h2 className="text-lg sm:text-xl lg:text-lg font-audiowide text-white mb-2 lg:mb-1.5">
            Bienvenue {userName || ''} !
          </h2>
          <p className="text-sm sm:text-base lg:text-sm text-gray-400 mb-4 lg:mb-3">
            Commencez par créer votre premier projet musical pour suivre votre progression.
          </p>
          <motion.a
            href="/projects"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block px-4 sm:px-6 lg:px-4 py-2 sm:py-3 lg:py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm sm:text-base lg:text-sm text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            Créer mon premier projet
          </motion.a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-3 lift-3d h-full flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 lg:p-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
            <FolderKanban size={16} className="sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5 text-purple-400" />
          </div>
          <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white">
            Mes Projets
          </h2>
        </div>
      </div>

      {/* Projets récents */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 flex-1">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : recentProjects.length > 0 ? (
          <div className="space-y-2 sm:space-y-2.5 lg:space-y-2 mb-3 sm:mb-4 lg:mb-3">
            {recentProjects.map((project) => {
              const updatedDate = project.updatedAt
                ? new Date(project.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })
                : null;
              return (
                <Link key={project.id} href={`/projects#${project.id}`} className="block group">
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="p-2 sm:p-2.5 lg:p-2 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-sm font-semibold text-white truncate mb-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <ProjectStatusBadge status={project.status as ProjectStatus} size="sm" />
                          {updatedDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {updatedDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FolderKanban size={16} className="sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4 mb-3 sm:mb-4 lg:mb-3 flex-1 flex items-center justify-center">
            Aucun projet récent
          </p>
        )}
      </div>

      {/* Bouton Voir tout */}
      <motion.a
        href="/projects"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="block mt-3 sm:mt-4 lg:mt-3 p-2.5 sm:p-3 lg:p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/20 hover:to-blue-500/20 transition-all text-center group"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm sm:text-base lg:text-sm text-white font-medium">
            Voir tous mes projets
          </span>
          <FolderKanban
            size={16}
            className="sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform"
          />
        </div>
      </motion.a>
    </motion.div>
  );
}
