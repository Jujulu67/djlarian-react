import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import type { SpinResult } from '@/types/slot-machine';
import { SymbolType, RewardType } from '@/types/slot-machine';

const DAILY_TOKENS = 100;
const SYMBOLS: SymbolType[] = [
  SymbolType.CHERRY,
  SymbolType.LEMON,
  SymbolType.ORANGE,
  SymbolType.PLUM,
  SymbolType.BELL,
  SymbolType.STAR,
  SymbolType.SEVEN,
];

/**
 * Vérifie si un reset quotidien est nécessaire et le fait si besoin
 */
function shouldResetDaily(lastResetDate: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetDate);

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDateOnly = new Date(
    lastReset.getFullYear(),
    lastReset.getMonth(),
    lastReset.getDate()
  );

  return nowDate.getTime() > lastResetDateOnly.getTime();
}

/**
 * Génère un symbole aléatoire
 */
function getRandomSymbol(): SymbolType {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

/**
 * Détermine la récompense selon les probabilités
 * RTP (Return To Player) cible : ~85-90%
 * Cela signifie que la banque garde 10-15% des mises sur le long terme
 *
 * Calcul de la valeur attendue :
 * - Triple (probabilité ~0.1%) : 3% queue skip, 7% ticket éternel, 90% 20-50 jetons (moyenne 35)
 * - Double (probabilité ~15%) : 30% rien, 70% 2-8 jetons (moyenne 5)
 * - Aucun match (probabilité ~85%) : 60% rien, 40% 1-3 jetons (moyenne 2)
 *
 * Valeur attendue ≈ 0.001 * (0.03*inestimable + 0.07*inestimable + 0.90*35)
 *                 + 0.15 * (0.30*0 + 0.70*5)
 *                 + 0.85 * (0.60*0 + 0.40*2)
 *                 ≈ 0.001 * 31.5 + 0.15 * 3.5 + 0.85 * 0.8
 *                 ≈ 0.0315 + 0.525 + 0.68
 *                 ≈ 1.24 (trop haut, besoin d'ajuster)
 *
 * Ajustement pour RTP ~87% :
 * - Triple : 2% queue skip, 3% ticket éternel, 95% 15-35 jetons (moyenne 25)
 * - Double : 50% rien, 50% 1-5 jetons (moyenne 3)
 * - Aucun : 70% rien, 30% 1-2 jetons (moyenne 1.5)
 */
function determineReward(symbols: [SymbolType, SymbolType, SymbolType]): {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
} {
  const [s1, s2, s3] = symbols;
  const allSame = s1 === s2 && s2 === s3;
  const twoSame = s1 === s2 || s2 === s3 || s1 === s3;

  const random = Math.random();

  if (allSame) {
    // 3 identiques = récompense majeure (très rare, ~0.1% de chance)
    if (random < 0.02) {
      // 2% queue skip
      return {
        rewardType: RewardType.QUEUE_SKIP,
        rewardAmount: 1,
        isWin: true,
        message: '🎉 Triple ! Vous avez gagné un Queue Skip !',
      };
    } else if (random < 0.05) {
      // 3% ticket éternel
      return {
        rewardType: RewardType.ETERNAL_TICKET,
        rewardAmount: 1,
        isWin: true,
        message: '🎉 Triple ! Vous avez gagné un Ticket Éternel !',
      };
    } else {
      // 95% jetons
      const tokens = Math.floor(Math.random() * 21) + 15; // 15-35 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
        message: `🎉 Triple ! Vous avez gagné ${tokens} jetons !`,
      };
    }
  } else if (twoSame) {
    // 2 identiques = récompense mineure
    if (random < 0.5) {
      // 50% rien
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
        message: '😔 Presque ! Essayez encore !',
      };
    } else {
      // 50% jetons
      const tokens = Math.floor(Math.random() * 5) + 1; // 1-5 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
        message: `🎊 Double ! Vous avez gagné ${tokens} jeton${tokens > 1 ? 's' : ''} !`,
      };
    }
  } else {
    // Aucun identique
    if (random < 0.7) {
      // 70% rien
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
        message: '😔 Pas de chance cette fois !',
      };
    } else {
      // 30% jetons minimaux
      const tokens = Math.floor(Math.random() * 2) + 1; // 1-2 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
        message: `✨ Vous avez gagné ${tokens} jeton${tokens > 1 ? 's' : ''} !`,
      };
    }
  }
}

/**
 * POST /api/slot-machine/spin
 * Joue un tour de machine à sous
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Récupérer ou créer l'entrée pour l'utilisateur
    let userTokens = await prisma.userSlotMachineTokens.findUnique({
      where: { userId: session.user.id },
    });

    if (!userTokens) {
      userTokens = await prisma.userSlotMachineTokens.create({
        data: {
          userId: session.user.id,
          tokens: DAILY_TOKENS,
          lastResetDate: new Date(),
        },
      });
    }

    // Vérifier si un reset quotidien est nécessaire
    if (shouldResetDaily(userTokens.lastResetDate)) {
      const today = new Date();
      userTokens = await prisma.userSlotMachineTokens.update({
        where: { userId: session.user.id },
        data: {
          tokens: DAILY_TOKENS,
          lastResetDate: today,
        },
      });
    }

    // Vérifier que l'utilisateur a des jetons (3 jetons par spin)
    const COST_PER_SPIN = 3;
    if (userTokens.tokens < COST_PER_SPIN) {
      return NextResponse.json(
        {
          error: `Vous n'avez plus assez de jetons. Il vous faut ${COST_PER_SPIN} jetons par spin. Revenez demain !`,
        },
        { status: 400 }
      );
    }

    // Générer les 3 symboles
    const symbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol(),
    ];

    // Déterminer la récompense
    const reward = determineReward(symbols);

    // Déduire 3 jetons et mettre à jour les statistiques
    const isWin = reward.isWin;

    // Calculer le nouveau nombre de jetons
    let newTokens = userTokens.tokens - COST_PER_SPIN;

    // Si la récompense est des jetons, les ajouter directement
    if (reward.rewardType === RewardType.TOKENS) {
      newTokens += reward.rewardAmount;
    }

    await prisma.userSlotMachineTokens.update({
      where: { userId: session.user.id },
      data: {
        tokens: newTokens,
        totalSpins: { increment: 1 },
        ...(isWin ? { totalWins: { increment: 1 } } : {}),
      },
    });

    const result: SpinResult = {
      symbols,
      rewardType: reward.rewardType,
      rewardAmount: reward.rewardAmount,
      isWin: reward.isWin,
      message: reward.message,
    };

    return createSuccessResponse(result, 200, 'Spin effectué');
  } catch (error) {
    return handleApiError(error, 'POST /api/slot-machine/spin');
  }
}
