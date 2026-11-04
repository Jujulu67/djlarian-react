import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit } from '@/lib/api/rateLimiter';
import { hash as bcryptHash } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/** Inscriptions par minute et par IP. */
const REGISTER_RATE_LIMIT = 5;

const registerSchema = z.object({
  email: z.email({ error: 'Adresse email invalide' }).max(254, 'Adresse email trop longue'),
  password: z
    .string({ error: 'Le mot de passe est requis' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères'),
  name: z
    .string({ error: 'Nom invalide' })
    .trim()
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional()
    .transform((value) => value || undefined),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, REGISTER_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('[API] /api/auth/register - Données invalides');
      // Premier message de validation (en français) quand le corps est bien un objet
      const message =
        body && typeof body === 'object'
          ? (parsed.error.issues[0]?.message ?? 'Données invalides')
          : 'Données invalides';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, name, password } = parsed.data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      logger.warn('[API] /api/auth/register - Email déjà utilisé');
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcryptHash(password, 12);

    // Créer l'utilisateur
    await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    });

    return NextResponse.json({ message: 'Utilisateur créé avec succès' }, { status: 201 });
  } catch (error) {
    logger.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}
