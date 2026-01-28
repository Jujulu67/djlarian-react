import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const reactivateLicenseSchema = z.object({
  licenseId: z.string().min(1, 'License ID is required'),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { licenseId } = reactivateLicenseSchema.parse(body);

    const license = await prisma.license.update({
      where: {
        id: licenseId,
      },
      data: {
        revoked: false,
        revokedReason: null,
      },
    });

    return NextResponse.json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[LICENSE_REACTIVATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
