import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signMessage, encryptLicenseData, ensureSodium } from '@/lib/license/crypto';
import { getLicenseTypeIndex } from '@/lib/license/types';

interface ActivationRequest {
  email: string;
  license_key: string;
  machine_id: string;
  plugin_version: string;
  os_info: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ActivationRequest = await req.json();
    const { email, license_key, machine_id, plugin_version, os_info } = body;

    console.log('[License Activate] Request received for:', license_key);
    console.log(
      '[License Activate] ED25519_PRIVATE_KEY exists:',
      !!process.env.ED25519_PRIVATE_KEY
    );

    // 0. Initialize libsodium and check for private key
    await ensureSodium();

    if (!process.env.ED25519_PRIVATE_KEY) {
      console.error('[License Activate] ED25519_PRIVATE_KEY is not configured!');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 1. Valider les inputs
    if (!email || !license_key || !machine_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 2. Trouver la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
      include: { activations: true, user: true },
    });

    if (!license) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 404 });
    }

    // 3. Vérifier que la licence n'est pas révoquée
    if (license.revoked) {
      return NextResponse.json(
        { success: false, error: 'This license has been revoked' },
        { status: 403 }
      );
    }

    // 4. Vérifier l'expiration
    if (license.expirationDate && license.expirationDate < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This license has expired' },
        { status: 403 }
      );
    }

    // 5. Vérifier l'email (optionnel mais recommandé)
    if (license.user.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email does not match license owner' },
        { status: 403 }
      );
    }

    // 6. Vérifier si déjà activé sur cette machine
    const existingActivation = license.activations.find((a) => a.machineId === machine_id);

    if (existingActivation) {
      // Déjà activé - retourner succès avec les données
      const licenseData = buildLicenseData(license, machine_id);
      const encrypted = await encryptLicenseData(licenseData, machine_id);
      const signature = await signMessage(encrypted);

      return NextResponse.json({
        success: true,
        license_data: encrypted,
        signature: signature,
        remaining_activations: license.maxActivations - license.activations.length,
      });
    }

    // 7. Vérifier le nombre d'activations
    if (license.activations.length >= license.maxActivations) {
      return NextResponse.json(
        { success: false, error: 'Machine activation limit reached' },
        { status: 403 }
      );
    }

    // 8. Créer l'activation
    await prisma.activation.create({
      data: {
        licenseId: license.id,
        machineId: machine_id,
        osInfo: os_info,
        pluginVersion: plugin_version,
      },
    });

    // 9. Construire et signer la réponse
    const licenseData = buildLicenseData(license, machine_id);
    const encrypted = await encryptLicenseData(licenseData, machine_id);
    const signature = await signMessage(encrypted);

    return NextResponse.json({
      success: true,
      license_data: encrypted,
      signature: signature,
      remaining_activations: license.maxActivations - license.activations.length - 1,
    });
  } catch (error) {
    console.error('[License Activate]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

function buildLicenseData(license: any, machineId: string) {
  return {
    email: license.user.email,
    licenseKey: license.licenseKey,
    machineID: machineId,
    type: getLicenseTypeIndex(license.licenseType),
    activationDate: Math.floor(Date.now() / 1000), // Unix timestamp en secondes
    expirationDate: license.expirationDate
      ? Math.floor(license.expirationDate.getTime() / 1000)
      : 0,
    lastValidation: Math.floor(Date.now() / 1000),
    loadCounter: 0,
  };
}
