import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/profile/accounts/unlink
 * Permet à l'utilisateur de désassocier un de ses comptes OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID manquant' }, { status: 400 });
    }

    // Vérifier que le compte existe et appartient à l'utilisateur connecté
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Compte OAuth introuvable' }, { status: 404 });
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Ce compte OAuth ne vous appartient pas' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur a au moins un autre moyen de connexion
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
            "Impossible de désassocier le dernier compte OAuth. Veuillez d'abord définir un mot de passe dans les paramètres de votre compte.",
        },
        { status: 400 }
      );
    }

    // Supprimer le compte OAuth
    await prisma.account.delete({
      where: { id: accountId },
    });

    console.log(
      `[Profile] Compte OAuth ${account.provider} désassocié par l'utilisateur ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      message: `Compte ${account.provider} désassocié avec succès`,
      provider: account.provider,
    });
  } catch (error) {
    console.error('[Profile] Erreur désassociation compte OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la désassociation du compte OAuth' },
      { status: 500 }
    );
  }
}
