import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const deleteLicenseSchema = z.object({
  licenseId: z.string().min(1, 'License ID is required'),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { licenseId } = deleteLicenseSchema.parse(body);

    const license = await prisma.license.delete({
      where: {
        id: licenseId,
      },
    });

    return NextResponse.json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[LICENSE_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
