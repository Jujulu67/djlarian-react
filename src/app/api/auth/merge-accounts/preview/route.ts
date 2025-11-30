import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { hkdf } from '@panva/hkdf';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { getImageUrl } from '@/lib/utils/getImageUrl';

/**
 * Route pour prévisualiser les données de fusion avant de confirmer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    // Décrypter le token
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const salt = cookieName;

    const encryptionSecret = await hkdf(
      'sha256',
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64
    );

    let decryptedToken;
    try {
      decryptedToken = await jwtDecrypt(token, encryptionSecret);
    } catch (error) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 });
    }

    const payload = decryptedToken.payload as {
      email: string;
      name?: string;
      image?: string;
      provider: string;
      existingUserId: string;
    };

    // Récupérer les données des deux comptes
    const existingUser = await prisma.user.findUnique({
      where: { id: payload.existingUserId },
      select: {
        email: true,
        name: true,
        image: true,
        hashedPassword: true,
        createdAt: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Compte existant introuvable' }, { status: 404 });
    }

    // Convertir l'imageId en URL si nécessaire (gère blob en prod et local en dev)
    // Si c'est déjà une URL externe (http/https), on la garde telle quelle
    // Si c'est un chemin local (/uploads/...), on le garde tel quel (servi directement par Next.js)
    // Sinon, on utilise getImageUrl pour générer l'URL via /api/images/[imageId]
    const existingUserImageUrl = existingUser.image
      ? existingUser.image.startsWith('http://') || existingUser.image.startsWith('https://')
        ? existingUser.image
        : existingUser.image.startsWith('/uploads/')
          ? existingUser.image // Chemin local, servi directement par Next.js
          : getImageUrl(existingUser.image) || existingUser.image
      : null;

    return NextResponse.json({
      existingAccount: {
        email: existingUser.email,
        name: existingUser.name,
        image: existingUserImageUrl,
        hasPassword: !!existingUser.hashedPassword,
        createdAt: existingUser.createdAt.toISOString(),
      },
      oauthAccount: {
        email: payload.email,
        name: payload.name,
        image: payload.image, // Les images OAuth sont déjà des URLs externes
        provider: payload.provider,
      },
    });
  } catch (error) {
    console.error('[API] Erreur preview merge:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
