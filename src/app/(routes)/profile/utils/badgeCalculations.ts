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
  Gamepad2,
  Joystick,
  Dices,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  gradient: string;
  iconColor: string;
  unlocked: boolean;
  isSecret: boolean;
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

export interface GameStats {
  gameHighScore: number;
  hasDiscoveredCasino: boolean;
}

/**
 * Calcule les badges de l'utilisateur basés sur ses statistiques et son profil
 * @param memberMonths - Nombre de mois depuis l'inscription
 * @param stats - Statistiques de l'utilisateur (projets, etc.)
 * @param user - Informations utilisateur (rôle, VIP, etc.)
 * @param gameStats - Statistiques de jeu (highscore, découvertes)
 * @returns Liste des badges avec leur statut (débloqué/verrouillé)
 */
export function calculateBadges(
  memberMonths: number,
  stats: UserStats,
  user: User,
  gameStats?: GameStats
): Badge[] {
  const isVip = user.isVip || false;
  const isAdmin = user.role === 'ADMIN';
  const highScore = gameStats?.gameHighScore ?? 0;
  const hasDiscoveredCasino = gameStats?.hasDiscoveredCasino ?? false;

  const badges: Badge[] = [
    // ===== BADGES NORMAUX =====
    // Badge nouveau membre
    {
      id: 'newcomer',
      name: 'Nouveau Membre',
      description: 'Bienvenue dans la communauté !',
      hint: 'Disponible uniquement le premier mois',
      icon: Sparkles,
      color: 'from-blue-400 to-cyan-400',
      gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-cyan-400',
      unlocked: memberMonths < 1,
      isSecret: false,
    },
    // Badge membre actif (3 mois)
    {
      id: 'active',
      name: 'Membre Actif',
      description: 'Membre depuis 3 mois',
      hint: 'Reste membre pendant 3 mois',
      icon: Heart,
      color: 'from-purple-400 to-pink-400',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      iconColor: 'text-pink-400',
      unlocked: memberMonths >= 3,
      isSecret: false,
    },
    // Badge membre fidèle (6 mois)
    {
      id: 'loyal',
      name: 'Membre Fidèle',
      description: 'Membre depuis 6 mois',
      hint: 'Reste membre pendant 6 mois',
      icon: Medal,
      color: 'from-amber-400 to-orange-400',
      gradient: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
      iconColor: 'text-orange-400',
      unlocked: memberMonths >= 6,
      isSecret: false,
    },
    // Badge vétéran (1 an)
    {
      id: 'veteran',
      name: 'Vétéran',
      description: 'Membre depuis 1 an',
      hint: 'Reste membre pendant 1 an',
      icon: Trophy,
      color: 'from-yellow-400 to-amber-400',
      gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-amber-400',
      unlocked: memberMonths >= 12,
      isSecret: false,
    },
    // Badge premier projet
    {
      id: 'first-project',
      name: 'Premier Pas',
      description: 'A créé son premier projet',
      hint: 'Crée ton premier projet',
      icon: Rocket,
      color: 'from-green-400 to-emerald-400',
      gradient: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
      iconColor: 'text-emerald-400',
      unlocked: stats.projects >= 1,
      isSecret: false,
    },
    // Badge productif (5 projets)
    {
      id: 'productive',
      name: 'Productif',
      description: 'A créé 5 projets',
      hint: 'Crée 5 projets',
      icon: Zap,
      color: 'from-blue-400 to-indigo-400',
      gradient: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-indigo-400',
      unlocked: stats.projects >= 5,
      isSecret: false,
    },
    // Badge maître (10 projets)
    {
      id: 'master',
      name: 'Maître',
      description: 'A créé 10 projets',
      hint: 'Crée 10 projets',
      icon: Gem,
      color: 'from-purple-400 to-violet-400',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20',
      iconColor: 'text-violet-400',
      unlocked: stats.projects >= 10,
      isSecret: false,
    },
    // Badge finisseur (1 projet terminé)
    {
      id: 'finisher',
      name: 'Finisseur',
      description: 'A terminé un projet',
      hint: 'Termine au moins un projet',
      icon: CheckCircle2,
      color: 'from-emerald-400 to-teal-400',
      gradient: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-teal-400',
      unlocked: stats.projectsTermines >= 1,
      isSecret: false,
    },
    // Badge VIP
    {
      id: 'vip',
      name: 'VIP',
      description: 'Membre VIP',
      hint: 'Obtiens le statut VIP',
      icon: Star,
      color: 'from-yellow-400 to-amber-400',
      gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-yellow-400',
      unlocked: isVip,
      isSecret: false,
    },
    // Badge administrateur
    {
      id: 'admin',
      name: 'Administrateur',
      description: 'Gestionnaire du site',
      hint: 'Réservé aux administrateurs',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
      iconColor: 'text-pink-400',
      unlocked: isAdmin,
      isSecret: false,
    },

    // ===== BADGES SECRETS =====
    // Badge Game Explorer - A joué au jeu easter egg
    {
      id: 'game-explorer',
      name: 'Game Explorer',
      description: 'A découvert le jeu caché',
      hint: 'Trouve et joue au jeu secret !',
      icon: Gamepad2,
      color: 'from-emerald-400 to-green-400',
      gradient: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-400',
      unlocked: highScore > 0,
      isSecret: true,
    },
    // Badge Gamer - 100 points
    {
      id: 'gamer',
      name: 'Gamer',
      description: 'A atteint 100 points au jeu',
      hint: 'Atteins 100 points au jeu secret',
      icon: Joystick,
      color: 'from-cyan-400 to-blue-400',
      gradient: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400',
      unlocked: highScore >= 100,
      isSecret: true,
    },
    // Badge Pro Gamer - 500 points
    {
      id: 'pro-gamer',
      name: 'Pro Gamer',
      description: 'A atteint 500 points au jeu',
      hint: 'Atteins 500 points au jeu secret',
      icon: Trophy,
      color: 'from-yellow-400 to-orange-400',
      gradient: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-400',
      unlocked: highScore >= 500,
      isSecret: true,
    },
    // Badge Casino Explorer - A découvert le casino
    {
      id: 'casino-explorer',
      name: 'Casino Explorer',
      description: 'A découvert le casino secret',
      hint: 'Trouve le casino caché !',
      icon: Dices,
      color: 'from-fuchsia-400 to-pink-400',
      gradient: 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20',
      iconColor: 'text-fuchsia-400',
      unlocked: hasDiscoveredCasino,
      isSecret: true,
    },
  ];

  return badges;
}
