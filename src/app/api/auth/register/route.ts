import { NextResponse } from 'next/server';

import { hash as bcryptHash } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  console.log('[API] /api/auth/register - Début');
  try {
    const body = await request.json();
    const { email, name, password } = body;

    console.log('[API] /api/auth/register - Données reçues:', {
      hasEmail: !!email,
      hasName: !!name,
      hasPassword: !!password,
      email,
    });

    if (!email || !name || !password) {
      console.warn('[API] /api/auth/register - Champs manquants');
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe déjà
    console.log('[API] /api/auth/register - Vérification utilisateur existant');
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    console.log('[API] /api/auth/register - Utilisateur existant:', !!existingUser);

    if (existingUser) {
      console.warn('[API] /api/auth/register - Email déjà utilisé');
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    // Hasher le mot de passe
    console.log('[API] /api/auth/register - Hashage du mot de passe');
    const hashedPassword = await bcryptHash(password, 12);

    // Créer l'utilisateur
    console.log("[API] /api/auth/register - Création de l'utilisateur");
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    });

    console.log('[API] /api/auth/register - Utilisateur créé avec succès:', {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({ message: 'Utilisateur créé avec succès' }, { status: 201 });
  } catch (error) {
    console.error('[API] /api/auth/register - Erreur:', error);
    logger.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}
