import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signMessage } from '@/lib/license/crypto';

interface ValidationRequest {
  license_key: string;
  machine_id: string;
  plugin_version: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidationRequest = await req.json();
    const { license_key, machine_id, plugin_version } = body;

    // 1. Trouver la licence avec l'activation
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
      include: {
        activations: {
          where: { machineId: machine_id },
        },
      },
    });

    if (!license) {
      return NextResponse.json({
        valid: false,
        status: 'invalid',
        signature: await signMessage('invalid'),
      });
    }

    // 2. Vérifier révocation
    if (license.revoked) {
      return NextResponse.json({
        valid: false,
        status: 'revoked',
        signature: await signMessage('revoked'),
      });
    }

    // 3. Vérifier expiration
    if (license.expirationDate && license.expirationDate < new Date()) {
      return NextResponse.json({
        valid: false,
        status: 'expired',
        signature: await signMessage('expired'),
      });
    }

    // 4. Vérifier que cette machine est activée
    if (license.activations.length === 0) {
      return NextResponse.json({
        valid: false,
        status: 'not_activated',
        signature: await signMessage('not_activated'),
      });
    }

    // 5. Mettre à jour lastValidated
    // Note: On utilise licenseId_machineId qui est l'index unique composé
    await prisma.activation.update({
      where: {
        licenseId_machineId: {
          licenseId: license.id,
          machineId: machine_id,
        },
      },
      data: {
        lastValidated: new Date(),
        pluginVersion: plugin_version,
      },
    });

    // 6. Retourner succès
    return NextResponse.json({
      valid: true,
      status: 'active',
      signature: await signMessage('active'),
    });
  } catch (error) {
    console.error('[License Validate]', error);
    return NextResponse.json(
      { valid: false, status: 'error', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
