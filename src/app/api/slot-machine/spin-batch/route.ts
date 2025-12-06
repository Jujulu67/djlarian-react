import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { SymbolType, RewardType, SpinResult } from '@/types/slot-machine';
import { COST_PER_SPIN, getRandomSymbol, determineReward } from '@/lib/slot-machine-logic';

const DAILY_TOKENS = 100;

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
    const totalCost = count * COST_PER_SPIN;
    if (userTokens.tokens < totalCost) {
      return NextResponse.json(
        {
          error: `Vous n'avez que ${userTokens.tokens} jetons. Il vous en faut ${totalCost} (${COST_PER_SPIN} par spin).`,
        },
        { status: 400 }
      );
    }

    // --- DYNAMIC LUCK SYSTEM ---
    // Si l'utilisateur a un taux de victoire inférieur à 45% (et au moins 10 spins), on booste les chances
    // Calcule du Win Rate : totalWins / totalSpins
    const winRate = userTokens.totalSpins > 10 ? userTokens.totalWins / userTokens.totalSpins : 1;
    const useBooster = winRate < 0.45;

    // Simuler tous les spins
    let totalTokensWon = 0;
    let totalWins = 0;
    let queueSkips = 0;
    let eternalTickets = 0;
    const results: SpinResult[] = [];

    // Pour l'affichage final (dernier spin)
    const lastSpinSymbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
    ];
    let lastReward: {
      rewardType: RewardType | null;
      rewardAmount: number;
      isWin: boolean;
      message: string;
    } | null = null;

    for (let i = 0; i < count; i++) {
      const symbols: [SymbolType, SymbolType, SymbolType] = [
        getRandomSymbol(useBooster),
        getRandomSymbol(useBooster),
        getRandomSymbol(useBooster),
      ];
      const reward = determineReward(symbols);

      // --- SPECIAL REWARD BONUS ---
      // User request: "sousous avec les big wins"
      let tokenBonus = 0;
      if (reward.rewardType === RewardType.QUEUE_SKIP) {
        tokenBonus = 100;
        reward.message += ` (+${tokenBonus} jetons)`;
      } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
        tokenBonus = 50;
        reward.message += ` (+${tokenBonus} jetons)`;
      }

      // Stocker le résultat individuel
      results.push({
        symbols,
        rewardType: reward.rewardType,
        rewardAmount: reward.rewardAmount,
        isWin: reward.isWin,
        message: reward.message,
      });

      if (i === count - 1) {
        // Garder le dernier spin pour l'affichage principal
        lastSpinSymbols[0] = symbols[0];
        lastSpinSymbols[1] = symbols[1];
        lastSpinSymbols[2] = symbols[2];
        lastReward = reward;
      }

      if (reward.isWin) {
        totalWins++;
        if (reward.rewardType === RewardType.QUEUE_SKIP) {
          queueSkips++;
          totalTokensWon += tokenBonus; // Add bonus tokens to total
        } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
          eternalTickets++;
          totalTokensWon += tokenBonus; // Add bonus tokens to total
        } else if (reward.rewardType === RewardType.TOKENS) {
          totalTokensWon += reward.rewardAmount; // include bonus? No, regular amount + 0 bonus
          // Wait, logic above says tokensWon = amount + bonus.
          // For regular tokens, bonus is 0.
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

    // Construire le message récapitulatif
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

    // Calculer les stats pour le résumé
    const netProfit = totalTokensWon - totalCost;
    const batchWinRate = totalWins > 0 ? Math.round((totalWins / count) * 100) : 0;

    return createSuccessResponse(
      {
        symbols: lastSpinSymbols,
        rewardType: lastReward?.rewardType || null,
        rewardAmount: lastReward?.rewardAmount || 0,
        isWin: lastReward?.isWin || false,
        message,
        results, // Detailed results
        summary: {
          totalSpins: count,
          totalWins,
          totalTokensWon,
          queueSkips,
          eternalTickets,
          netProfit,
          winRate: batchWinRate,
        },
      },
      200,
      'Spins batch effectués'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/slot-machine/spin-batch');
  }
}
