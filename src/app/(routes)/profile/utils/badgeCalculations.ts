/**
 * Utilitaires pour le calcul des badges utilisateur
 */

import {
  Sparkles,
  Heart,
  Medal,
  Trophy,
  Rocket,
  Zap,
  Gem,
  CheckCircle2,
  Star,
  Crown,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  gradient: string;
  iconColor: string;
  unlocked: boolean;
}

interface UserStats {
  projects: number;
  projectsEnCours: number;
  projectsTermines: number;
}

interface User {
  role?: string;
  isVip?: boolean;
}

/**
 * Calcule les badges de l'utilisateur basés sur ses statistiques et son profil
 * @param memberMonths - Nombre de mois depuis l'inscription
 * @param stats - Statistiques de l'utilisateur (projets, etc.)
 * @param user - Informations utilisateur (rôle, VIP, etc.)
 * @returns Liste des badges avec leur statut (débloqué/verrouillé)
 */
export function calculateBadges(memberMonths: number, stats: UserStats, user: User): Badge[] {
  const isVip = user.isVip || false;
  const isAdmin = user.role === 'ADMIN';

  const badges: Badge[] = [
    // Badge nouveau membre
    {
      id: 'newcomer',
      name: 'Nouveau Membre',
      description: 'Bienvenue dans la communauté !',
      icon: Sparkles,
      color: 'from-blue-400 to-cyan-400',
      gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-cyan-400',
      unlocked: memberMonths < 1,
    },
    // Badge membre actif (3 mois)
    {
      id: 'active',
      name: 'Membre Actif',
      description: 'Membre depuis 3 mois',
      icon: Heart,
      color: 'from-purple-400 to-pink-400',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      iconColor: 'text-pink-400',
      unlocked: memberMonths >= 3,
    },
    // Badge membre fidèle (6 mois)
    {
      id: 'loyal',
      name: 'Membre Fidèle',
      description: 'Membre depuis 6 mois',
      icon: Medal,
      color: 'from-amber-400 to-orange-400',
      gradient: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
      iconColor: 'text-orange-400',
      unlocked: memberMonths >= 6,
    },
    // Badge vétéran (1 an)
    {
      id: 'veteran',
      name: 'Vétéran',
      description: 'Membre depuis 1 an',
      icon: Trophy,
      color: 'from-yellow-400 to-amber-400',
      gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-amber-400',
      unlocked: memberMonths >= 12,
    },
    // Badge premier projet
    {
      id: 'first-project',
      name: 'Premier Pas',
      description: 'A créé son premier projet',
      icon: Rocket,
      color: 'from-green-400 to-emerald-400',
      gradient: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
      iconColor: 'text-emerald-400',
      unlocked: stats.projects >= 1,
    },
    // Badge productif (5 projets)
    {
      id: 'productive',
      name: 'Productif',
      description: 'A créé 5 projets',
      icon: Zap,
      color: 'from-blue-400 to-indigo-400',
      gradient: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-indigo-400',
      unlocked: stats.projects >= 5,
    },
    // Badge maître (10 projets)
    {
      id: 'master',
      name: 'Maître',
      description: 'A créé 10 projets',
      icon: Gem,
      color: 'from-purple-400 to-violet-400',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20',
      iconColor: 'text-violet-400',
      unlocked: stats.projects >= 10,
    },
    // Badge finisseur (1 projet terminé)
    {
      id: 'finisher',
      name: 'Finisseur',
      description: 'A terminé un projet',
      icon: CheckCircle2,
      color: 'from-emerald-400 to-teal-400',
      gradient: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-teal-400',
      unlocked: stats.projectsTermines >= 1,
    },
    // Badge VIP
    {
      id: 'vip',
      name: 'VIP',
      description: 'Membre VIP',
      icon: Star,
      color: 'from-yellow-400 to-amber-400',
      gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-yellow-400',
      unlocked: isVip,
    },
    // Badge administrateur
    {
      id: 'admin',
      name: 'Administrateur',
      description: 'Gestionnaire du site',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      iconColor: 'text-pink-400',
      unlocked: isAdmin,
    },
  ];

  return badges;
}
