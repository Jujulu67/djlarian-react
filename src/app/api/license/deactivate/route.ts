import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signMessage } from '@/lib/license/crypto';
import { logger } from '@/lib/logger';

interface DeactivationRequest {
  license_key: string;
  machine_id: string;
}

/**
 * POST /api/license/deactivate
 * Appelée par le plugin (sans session) et par le site : la clé de licence sert de preuve,
 * comme pour /api/license/activate. Seule l'activation de la machine indiquée est retirée.
 */
export async function POST(req: NextRequest) {
  try {
    const body: DeactivationRequest = await req.json();
    const { license_key, machine_id } = body;

    if (
      typeof license_key !== 'string' ||
      !license_key ||
      typeof machine_id !== 'string' ||
      !machine_id
    ) {
      return NextResponse.json(
        { success: false, error: 'license_key and machine_id are required' },
        { status: 400 }
      );
    }

    // 1. Trouver la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }

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
    logger.error('[License Deactivate]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
