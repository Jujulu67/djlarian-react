import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api/requireAuth';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    // Optional: Check for admin role if your app has roles
    // if (session.user.role !== 'ADMIN') { ... }

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
