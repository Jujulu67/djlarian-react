import { NextResponse } from 'next/server';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { SpinResult } from '@/types/slot-machine';
import { SymbolType, RewardType } from '@/types/slot-machine';
import { COST_PER_SPIN, getRandomSymbol, determineReward } from '@/lib/slot-machine-logic';
import { applySpinOutcome, loadUserTokens } from '@/lib/slot-machine-rewards';
import { requireAuth } from '@/lib/api/requireAuth';

const insufficientTokens = () =>
  NextResponse.json(
    {
      error: `Vous n'avez plus assez de jetons. Il vous faut ${COST_PER_SPIN} jetons par spin. Revenez demain !`,
    },
    { status: 400 }
  );

/**
 * POST /api/slot-machine/spin
 * Joue un tour de machine à sous. Le débit des jetons, le crédit des gains et l'octroi des
 * items (Queue Skip, Ticket Éternel) se font côté serveur, dans une même transaction.
 */
export async function POST() {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;
    const userId = session.user.id;

    const userTokens = await loadUserTokens(userId);

    // Contrôle rapide (le débit reste conditionné au solde au moment de l'écriture)
    if (userTokens.tokens < COST_PER_SPIN) {
      return insufficientTokens();
    }

    // --- DYNAMIC LUCK SYSTEM ---
    // Si l'utilisateur a un taux de victoire inférieur à 45% (et au moins 10 spins), on booste les chances
    const winRate = userTokens.totalSpins > 10 ? userTokens.totalWins / userTokens.totalSpins : 1;
    const useBooster = winRate < 0.45;

    const symbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
      getRandomSymbol(useBooster),
    ];

    const reward = determineReward(symbols);

    // --- SPECIAL REWARD BONUS ---
    // Bonus de jetons pour les items spéciaux
    let tokenBonus = 0;
    if (reward.rewardType === RewardType.QUEUE_SKIP) {
      tokenBonus = 100;
      reward.message += ` (+${tokenBonus} jetons)`;
    } else if (reward.rewardType === RewardType.ETERNAL_TICKET) {
      tokenBonus = 50;
      reward.message += ` (+${tokenBonus} jetons)`;
    }

    const tokensWon =
      (reward.rewardType === RewardType.TOKENS ? reward.rewardAmount : 0) + tokenBonus;

    const applied = await applySpinOutcome(userId, {
      cost: COST_PER_SPIN,
      tokensWon,
      spins: 1,
      wins: reward.isWin ? 1 : 0,
      queueSkips: reward.rewardType === RewardType.QUEUE_SKIP ? reward.rewardAmount : 0,
      eternalTickets: reward.rewardType === RewardType.ETERNAL_TICKET ? reward.rewardAmount : 0,
    });
    if (!applied) {
      return insufficientTokens();
    }

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
