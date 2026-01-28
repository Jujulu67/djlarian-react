import { NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createCreatedResponse,
  createForbiddenResponse,
  createConflictResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import { hash as bcryptHash } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * Zod schema for user creation
 */
const createUserSchema = z
  .object({
    email: z.string().email("Format d'email invalide"),
    name: z.string().nullable().optional(),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    role: z.enum(['ADMIN', 'USER', 'MODERATOR']),
    isVip: z.boolean().optional().default(false),
  })
  .strict();

type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * GET /api/users
 * Récupère la liste des utilisateurs (tous les utilisateurs authentifiés)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Permettre à tous les utilisateurs authentifiés de voir la liste des utilisateurs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return createSuccessResponse(users, 200, 'Utilisateurs récupérés');
  } catch (error) {
    return handleApiError(error, 'GET /api/users');
  }
}

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export async function POST(request: Request) {
  // Rate limiting (10 users/min)
  const { rateLimit } = await import('@/lib/api/rateLimiter');
  const rateLimitResponse = await rateLimit(request as any, 10);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await auth();

  // 1. Verify user is admin
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return createForbiddenResponse('Non autorisé');
  }

  try {
    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return handleApiError(new Error('Invalid JSON body'), 'POST /api/users');
    }

    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('User creation validation failed', validationResult.error.flatten());
      return handleApiError(validationResult.error, 'POST /api/users');
    }

    const data: CreateUserInput = validationResult.data;

    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return createConflictResponse('Cet email est déjà utilisé');
    }

    // 4. Hash password
    const hashedPassword = await bcryptHash(data.password, 10);

    // 5. Create user in database
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name || null,
        hashedPassword,
        role: data.role,
        isVip: data.isVip ?? false,
        emailVerified: new Date(), // Consider email verified if created by admin
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVip: true,
      },
    });

    logger.debug(
      `Admin ${session.user.email} created user ${newUser.email} with isVip=${newUser.isVip}`
    );

    // 6. Envoyer un webhook pour la création
    const { sendWebhook } = await import('@/lib/api/webhooks');
    await sendWebhook(
      'user.created',
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      {
        userId: session.user.id,
      }
    );

    // 7. Return created user
    return createCreatedResponse(newUser, 'Utilisateur créé avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/users');
  }
}
