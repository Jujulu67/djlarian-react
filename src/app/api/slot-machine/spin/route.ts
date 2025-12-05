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
/**
 * Détermine la récompense selon les probabilités
 * RTP (Return To Player) cible : 0.7
 * Coût : 3 jetons. Retour attendu : 2.1 valeur.
 *
 * Valeurs estimées :
 * - Queue Skip : ~500 jetons
 * - Ticket Éternel : ~50 jetons
 * - 1 Jeton : 1 valeur
 *
 * Probabilités :
 * - Super Jackpot (Queue Skip) : 0.05% (1/2000) -> Contrib 0.25
 * - Jackpot (Ticket Éternel) : 0.5% (1/200) -> Contrib 0.25
 * - Triple (20 Jetons) : 2% -> Contrib 0.4
 * - Double (5 Jetons) : 15% -> Contrib 0.75
 * - Petit Gain (2 Jetons) : 22.5% -> Contrib 0.45
 * - Perdu : ~60%
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

  // Super Jackpot & Jackpot (Indépendant des symboles pour le contrôle précis du RTP)
  if (random < 0.0005) {
    return {
      rewardType: RewardType.QUEUE_SKIP,
      rewardAmount: 1,
      isWin: true,
      message: '🎉 JACKPOT ULTIME ! Un Queue Skip !',
    };
  }

  if (random < 0.0055) {
    return {
      rewardType: RewardType.ETERNAL_TICKET,
      rewardAmount: 1,
      isWin: true,
      message: '🎉 JACKPOT ! Un Ticket Éternel !',
    };
  }

  if (allSame) {
    // Triple (2% global chance adjusted logic, but here conditional on symbols)
    // To simplify, we force the reward if symbols match, but we rely on RNG for symbol generation usually.
    // However, to enforce strict RTP, we often rig the result first then pick symbols.
    // But here we already have symbols.
    // Let's stick to the "Result determines Reward" logic if we want strict RTP,
    // OR adjust symbol probabilities.
    // Given the current code structure, let's just map the symbols to the reward tiers defined above roughly.

    // 3 identiques = Gros lot de jetons
    return {
      rewardType: RewardType.TOKENS,
      rewardAmount: 20,
      isWin: true,
      message: '🎉 Triple ! 20 jetons !',
    };
  } else if (twoSame) {
    // 2 identiques
    // On peut ajouter un peu de hasard pour ne pas gagner à tous les coups sur 2 identiques si on veut baisser le RTP,
    // mais 15% de chance d'avoir 2 identiques est naturel sur 7 symboles ?
    // P(2 same) ~ 1 - P(all diff) - P(all same).
    // P(all diff) = 1 * 6/7 * 5/7 = 30/49 ≈ 0.61.
    // P(all same) = 1/49 ≈ 0.02.
    // P(2 same) ≈ 1 - 0.61 - 0.02 = 0.37.
    // 37% de chance d'avoir 2 identiques. C'est trop haut pour notre target de 15%.
    // Donc on ne paye que ~40% des "Double".

    if (Math.random() < 0.4) {
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: 5,
        isWin: true,
        message: '🎊 Double ! 5 jetons !',
      };
    } else {
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
        message: '😔 Presque !',
      };
    }
  } else {
    // Aucun identique (61% du temps)
    // On veut payer "Petit Gain" 22.5% du temps total.
    // 22.5 / 61 ≈ 0.37.
    if (Math.random() < 0.37) {
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: 2,
        isWin: true,
        message: '✨ Petit gain : 2 jetons.',
      };
    } else {
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
        message: '😔 Pas de chance.',
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
