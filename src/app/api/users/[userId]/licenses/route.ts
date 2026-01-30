import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const resolvedParams = await params;
  const userId = resolvedParams.userId;

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

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
    console.error('Failed to fetch user licenses:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des licences' }, { status: 500 });
  }
}
