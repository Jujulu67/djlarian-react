import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { loadUserTokens } from '@/lib/slot-machine-rewards';
import type { SlotMachineStatus } from '@/types/slot-machine';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * GET /api/slot-machine/status
 * Récupère le statut de la machine à sous pour l'utilisateur
 */
export async function GET() {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    // Récupérer ou créer l'entrée, avec recharge quotidienne si besoin
    const userTokens = await loadUserTokens(session.user.id);

    // Calculer la date du prochain reset (minuit du jour suivant)
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);

    const status: SlotMachineStatus = {
      tokens: userTokens.tokens,
      nextResetDate: nextReset,
      totalSpins: userTokens.totalSpins,
      totalWins: userTokens.totalWins,
    };

    return createSuccessResponse(status, 200, 'Statut récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/slot-machine/status');
  }
}
