import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { session, error: authError } = await requireAuth({ message: 'Non authentifié' });
  if (authError) return authError;
  const { userId } = await params;

  // Seul l'utilisateur lui-même ou un admin peut voir les licences
  if (session.user.id !== userId && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const licenses = await prisma.license.findMany({
      where: {
        userId: userId,
      },
      include: {
        activations: {
          orderBy: { activatedAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(licenses);
  } catch (error) {
    logger.error('Failed to fetch user licenses:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des licences' }, { status: 500 });
  }
}
