import { NextRequest, NextResponse } from 'next/server';
import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import prisma from '@/lib/prisma';
import { hkdf } from '@panva/hkdf';
import { EncryptJWT, base64url, calculateJwkThumbprint } from 'jose';

/**
 * Route API pour la connexion avec credentials
 * Crée un JWT chiffré (JWE) compatible avec Auth.js v5
 *
 * Utilise la même méthode de dérivation de clé que Auth.js:
 * - HKDF avec SHA-256
 * - Salt = nom du cookie
 * - Info = "Auth.js Generated Encryption Key ({salt})"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      console.warn('[API] /api/auth/signin-credentials - Credentials manquants');
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email as string },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        role: true,
        image: true,
      },
    });

    if (!user || !user.hashedPassword) {
      console.warn(
        '[API] /api/auth/signin-credentials - Utilisateur non trouvé ou sans mot de passe'
      );
      return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcryptCompare(password as string, user.hashedPassword);

    if (!isPasswordValid) {
      console.warn('[API] /api/auth/signin-credentials - Mot de passe invalide');
      return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    // Configuration
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

    if (!secret) {
      console.error('[API] /api/auth/signin-credentials - NEXTAUTH_SECRET non défini');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const salt = cookieName; // Le salt est le nom du cookie

    const maxAge = 30 * 24 * 60 * 60; // 30 jours
    const now = Math.floor(Date.now() / 1000);
    const expires = now + maxAge;

    // Payload du token - doit correspondre à ce que Auth.js attend
    const tokenPayload = {
      name: user.name,
      email: user.email,
      picture: user.image,
      sub: user.id,
      id: user.id,
      role: user.role,
    };

    // Dériver la clé de chiffrement exactement comme Auth.js le fait
    // Utilise HKDF avec SHA-256, longueur 64 bytes pour A256CBC-HS512
    const encryptionSecret = await hkdf(
      'sha256',
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64 // 64 bytes pour A256CBC-HS512
    );

    // Calculer le thumbprint pour le kid
    const hashAlg =
      encryptionSecret.byteLength << 3 === 512
        ? 'sha512'
        : encryptionSecret.byteLength << 3 === 384
          ? 'sha384'
          : 'sha256';
    const thumbprint = await calculateJwkThumbprint(
      { kty: 'oct', k: base64url.encode(encryptionSecret) },
      hashAlg
    );

    // Créer le JWE (JWT chiffré) avec jose
    const token = await new EncryptJWT(tokenPayload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512', kid: thumbprint })
      .setIssuedAt(now)
      .setExpirationTime(expires)
      .setJti(crypto.randomUUID())
      .encrypt(encryptionSecret);

    // Créer la réponse
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Définir le cookie de session
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge,
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[API] /api/auth/signin-credentials - Erreur:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
