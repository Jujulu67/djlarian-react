import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateLicenseKey } from '@/lib/license/keyGenerator';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createLicenseSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    type: z.enum(['STANDARD', 'EDU', 'NFR', 'BETA', 'LIFETIME']).default('STANDARD'),
    expirationDate: z.string().optional(), // ISO string
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
    path: ['email'],
  });

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = createLicenseSchema.parse(body);

    let targetUserId = validatedData.userId;

    if (!targetUserId && validatedData.email) {
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
      if (!user) {
        return new NextResponse('User not found with this email', { status: 404 });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return new NextResponse('User ID resolution failed', { status: 400 });
    }

    const key = generateLicenseKey();

    // Ensure uniqueness
    const existing = await prisma.license.findUnique({ where: { licenseKey: key } });
    if (existing) {
      return new NextResponse('License key collision, please try again', { status: 409 });
    }

    // Use the validated type directly (already matches Prisma enum)
    const dbType = validatedData.type;

    const license = await prisma.license.create({
      data: {
        licenseKey: key,
        userId: targetUserId,
        licenseType: dbType as any,
        revoked: false,
        expirationDate: validatedData.expirationDate
          ? new Date(validatedData.expirationDate)
          : null,
      },
    });

    return NextResponse.json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    console.error('[LICENSE_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
