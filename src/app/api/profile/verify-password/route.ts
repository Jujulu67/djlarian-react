import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/api/requireAuth';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    });
    if (error) return error;

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        hashedPassword: true,
      },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json({ error: 'Aucun mot de passe défini' }, { status: 400 });
    }

    const isPasswordValid = await bcryptCompare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    logger.info(`[Profile] Mot de passe vérifié pour l'utilisateur ${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Profile] Erreur vérification mot de passe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du mot de passe' },
      { status: 500 }
    );
  }
}
