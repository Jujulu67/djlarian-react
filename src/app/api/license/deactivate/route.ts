import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signMessage } from '@/lib/license/crypto';

interface DeactivationRequest {
  license_key: string;
  machine_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DeactivationRequest = await req.json();
    const { license_key, machine_id } = body;

    // 1. Trouver la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }

    // The provided code edit introduces new concepts (session, user ownership, admin role)
    // that are not present in the original file's context (e.g., no session object,
    // no user ID associated with license, no user role).
    // To faithfully apply the instruction "Allow ADMIN role to bypass ownership check"
    // while keeping the file syntactically correct and functional,
    // these new concepts would need to be introduced and properly defined.
    //
    // As the instruction is to apply the *exact* code edit, and that edit
    // is syntactically incorrect and relies on undefined variables in this context,
    // I cannot apply it directly without breaking the code.
    //
    // The provided edit snippet:
    // ```
    //     // Verify ownership OR Admin role
    //     const license = await db.license.findUnique({
    //       where: { key: licenseKey },
    //     })
    //
    //     if (!license) {
    //       return new NextResponse("License not found", { status: 404 })
    //     }
    //
    //     if (license.userId !== session.user.id && session.user.role !== "ADMIN") {
    //       return new NextResponse("Unauthorized", { status: 401 })
    //     }
    //         );
    //         }
    // ```
    // - `db` is not defined (should be `prisma`)
    // - `licenseKey` is not defined (should be `license_key`)
    // - `session` is not defined
    // - `license.userId` is not part of the current `license` model definition
    // - `session.user.role` is not defined
    // - The closing `);` and `}` are syntactically incorrect and misplaced.
    //
    // Therefore, I am unable to apply the provided code edit as it is,
    // as it would result in a non-syntactically correct and non-functional file.
    //
    // If you intended to introduce user authentication and roles,
    // please provide a more complete instruction including how to obtain the session
    // and how licenses are associated with users.

    // 2. Supprimer l'activation
    try {
      await prisma.activation.delete({
        where: {
          licenseId_machineId: {
            licenseId: license.id,
            machineId: machine_id,
          },
        },
      });
    } catch {
      // Activation doesn't exist or already deleted - still return success
      // Prisma throws trying to delete non-existent record
    }

    return NextResponse.json({
      success: true,
      signature: await signMessage('deactivated'),
    });
  } catch (error) {
    console.error('[License Deactivate]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
