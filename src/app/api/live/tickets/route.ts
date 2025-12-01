import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { TicketSource } from '@/types/live';

const createTicketSchema = z.object({
  quantity: z.number().int().positive(),
  source: z.nativeEnum(TicketSource),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/live/tickets
 * Récupère les tickets actifs de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse(tickets, 200, 'Tickets récupérés');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/tickets');
  }
}

/**
 * POST /api/live/tickets
 * Ajoute des tickets (pour tests/admin)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Seuls les admins peuvent créer des tickets manuellement
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createTicketSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { quantity, source, expiresAt } = validationResult.data;

    const ticket = await prisma.userTicket.create({
      data: {
        userId: session.user.id,
        quantity,
        source,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    logger.debug(`[Live] Ticket créé: ${ticket.id} pour l'utilisateur ${session.user.id}`);

    return createSuccessResponse(ticket, 201, 'Ticket créé avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/live/tickets');
  }
}
