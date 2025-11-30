import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Route pour désassocier un compte OAuth d'un utilisateur
 * DELETE /api/admin/users/[userId]/unlink-account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    // Vérifier l'authentification et les autorisations
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { userId } = resolvedParams;
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID manquant' }, { status: 400 });
    }

    // Vérifier que le compte existe et appartient à l'utilisateur
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Compte OAuth introuvable' }, { status: 404 });
    }

    if (account.userId !== userId) {
      return NextResponse.json(
        { error: 'Ce compte OAuth ne appartient pas à cet utilisateur' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur a au moins un autre moyen de connexion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hashedPassword: true,
        Account: {
          select: {
            id: true,
            type: true,
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Si c'est le seul compte OAuth et qu'il n'a pas de mot de passe, empêcher la désassociation
    // Note: NextAuth utilise 'oidc' comme type pour OAuth (Google, Twitch, etc.)
    const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth' || acc.type === 'oidc');
    const hasPassword = !!user.hashedPassword;

    if (oauthAccounts.length === 1 && !hasPassword) {
      return NextResponse.json(
        {
          error:
            "Impossible de désassocier le dernier compte OAuth si aucun mot de passe n'est défini",
        },
        { status: 400 }
      );
    }

    // Supprimer le compte OAuth
    await prisma.account.delete({
      where: { id: accountId },
    });

    logger.info(
      `[Admin] Compte OAuth ${account.provider} désassocié de l'utilisateur ${userId} par ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Compte ${account.provider} désassocié avec succès`,
    });
  } catch (error) {
    logger.error('[Admin] Erreur désassociation compte OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la désassociation du compte OAuth' },
      { status: 500 }
    );
  }
}
