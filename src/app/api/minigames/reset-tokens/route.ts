import { NextRequest, NextResponse } from 'next/server';
import {
  createForbiddenResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api/requireAuth';

export async function POST(request: NextRequest) {
  try {
    // Outil de test réservé aux admins (le bouton n'est affiché qu'à eux)
    const { session, error } = await requireAdmin({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
      onNonAdmin: () => createForbiddenResponse('Accès réservé aux administrateurs'),
    });
    if (error) return error;

    // Reset tokens to daily amount
    const RESET_AMOUNT = 100;

    const userTokens = await prisma.userSlotMachineTokens.upsert({
      where: { userId: session.user.id },
      update: {
        tokens: RESET_AMOUNT,
        lastResetDate: new Date(),
      },
      create: {
        userId: session.user.id,
        tokens: RESET_AMOUNT,
        lastResetDate: new Date(),
      },
    });

    return createSuccessResponse(userTokens, 200, `Jetons réinitialisés à ${RESET_AMOUNT}`);
  } catch (error) {
    return handleApiError(error, 'POST /api/minigames/reset-tokens');
  }
}
