import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
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
 * Détermine la récompense selon les probabilités (même logique que spin/route.ts)
 */
function determineReward(symbols: [SymbolType, SymbolType, SymbolType]): {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
} {
  const [s1, s2, s3] = symbols;
  const allSame = s1 === s2 && s2 === s3;
  const twoSame = s1 === s2 || s2 === s3 || s1 === s3;

  const random = Math.random();

  if (allSame) {
    if (random < 0.02) {
      return {
        rewardType: RewardType.QUEUE_SKIP,
        rewardAmount: 1,
        isWin: true,
      };
    } else if (random < 0.05) {
      return {
        rewardType: RewardType.ETERNAL_TICKET,
        rewardAmount: 1,
        isWin: true,
      };
    } else {
      const tokens = Math.floor(Math.random() * 21) + 15; // 15-35 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
      };
    }
  } else if (twoSame) {
    if (random < 0.5) {
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
      };
    } else {
      const tokens = Math.floor(Math.random() * 5) + 1; // 1-5 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
      };
    }
  } else {
    if (random < 0.7) {
      return {
        rewardType: null,
        rewardAmount: 0,
        isWin: false,
      };
    } else {
      const tokens = Math.floor(Math.random() * 2) + 1; // 1-2 jetons
      return {
        rewardType: RewardType.TOKENS,
        rewardAmount: tokens,
        isWin: true,
      };
    }
  }
}

/**
 * POST /api/slot-machine/spin-batch
 * Calcule plusieurs spins en une fois et retourne le résultat agrégé
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const body = await request.json();
    const { count } = body;

    if (!count || typeof count !== 'number' || count < 1 || count > 1000) {
      return NextResponse.json({ error: 'Nombre de spins invalide (1-1000)' }, { status: 400 });
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

    // Vérifier que l'utilisateur a assez de jetons (3 jetons par spin)
    const COST_PER_SPIN = 3;
    const totalCost = count * COST_PER_SPIN;
    if (userTokens.tokens < totalCost) {
      return NextResponse.json(
        {
          error: `Vous n'avez que ${userTokens.tokens} jetons. Il vous en faut ${totalCost} (${COST_PER_SPIN} par spin).`,
        },
        { status: 400 }
      );
    }

    // Simuler tous les spins
    let totalTokensWon = 0;
    let totalWins = 0;
    let queueSkips = 0;
    let eternalTickets = 0;
    const lastSpinSymbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol(),
    ];
    let lastReward: { rewardType: RewardType | null; rewardAmount: number; isWin: boolean } | null =
      null;

    for (let i = 0; i < count; i++) {
      const symbols: [SymbolType, SymbolType, SymbolType] = [
        getRandomSymbol(),
        getRandomSymbol(),
        getRandomSymbol(),
      ];
      const reward = determineReward(symbols);

      if (i === count - 1) {
        // Garder le dernier spin pour l'affichage
        lastSpinSymbols[0] = symbols[0];
        lastSpinSymbols[1] = symbols[1];
        lastSpinSymbols[2] = symbols[2];
        lastReward = reward;
      }

      if (reward.isWin) {
        totalWins++;
        if (reward.rewardType === RewardType.QUEUE_SKIP) {
          queueSkips++;
        } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
          eternalTickets++;
        } else if (reward.rewardType === RewardType.TOKENS) {
          totalTokensWon += reward.rewardAmount;
        }
      }
    }

    // Calculer le nouveau nombre de jetons (3 jetons par spin)
    let newTokens = userTokens.tokens - totalCost + totalTokensWon;

    // Mettre à jour la base de données
    await prisma.userSlotMachineTokens.update({
      where: { userId: session.user.id },
      data: {
        tokens: newTokens,
        totalSpins: { increment: count },
        totalWins: { increment: totalWins },
      },
    });

    // Construire le message détaillé
    const messageParts = [];
    if (queueSkips > 0) {
      messageParts.push(`🎁 ${queueSkips} Queue Skip${queueSkips > 1 ? 's' : ''}`);
    }
    if (eternalTickets > 0) {
      messageParts.push(
        `🎫 ${eternalTickets} Ticket${eternalTickets > 1 ? 's' : ''} Éternel${eternalTickets > 1 ? 's' : ''}`
      );
    }
    if (totalTokensWon > 0) {
      messageParts.push(`💰 ${totalTokensWon} jeton${totalTokensWon > 1 ? 's' : ''}`);
    }

    let message = `🎰 ${count} spins : ${totalWins} victoires !`;
    if (messageParts.length > 0) {
      message += `\n${messageParts.join('\n')}`;
    }

    if (queueSkips === 0 && eternalTickets === 0 && totalTokensWon === 0) {
      message += '\n😔 Aucun gain cette fois...';
    }

    return createSuccessResponse(
      {
        symbols: lastSpinSymbols,
        rewardType: lastReward?.rewardType || null,
        rewardAmount: lastReward?.rewardAmount || 0,
        isWin: lastReward?.isWin || false,
        message,
        summary: {
          totalSpins: count,
          totalWins,
          totalTokensWon,
          queueSkips,
          eternalTickets,
        },
      },
      200,
      'Spins batch effectués'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/slot-machine/spin-batch');
  }
}
