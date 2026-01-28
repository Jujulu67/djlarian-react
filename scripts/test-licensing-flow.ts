import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { decryptLicenseData, ensureSodium } from '../src/lib/license/crypto';
import sodium from 'libsodium-wrappers';
// Native fetch available in Node 18+
import * as dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL missing from environment.');
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function main() {
  console.log('🚀 Starting Licensing Integration Test...');

  await ensureSodium();

  // 1. Create Test User & License
  const testEmail = `test-license-${Date.now()}@example.com`;
  const testKey = `LARIAN-TEST-${Date.now().toString().slice(-4)}-XXXX`;
  const testMachineId = sodium.to_hex(sodium.randombytes_buf(32)); // 64 chars hex

  console.log(`Creating test user: ${testEmail}`);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Test User',
      licenses: {
        create: {
          licenseKey: testKey,
          licenseType: 'STANDARD',
          // status: "ACTIVE", // Removed
          maxActivations: 2,
          revoked: false,
        },
      },
    },
    include: { licenses: true },
  });

  console.log(`✅ User created. License Key: ${testKey}`);

  try {
    // 2. Activate
    console.log('\n📡 Testing /api/license/activate...');
    const activateRes = await fetch(`${API_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: testKey,
        machine_id: testMachineId,
        email: testEmail,
        plugin_version: '1.0.0',
        os_info: 'macOS 14.0',
      }),
    });

    if (!activateRes.ok) {
      const errText = await activateRes.text();
      console.error(`❌ ACTIVATION FAILED: ${activateRes.status} - ${errText}`);
      throw new Error(`Activation failed: ${activateRes.status} ${errText}`);
    }

    const activateData: any = await activateRes.json();
    console.log('Response:', activateData);

    if (!activateData.license_data || !activateData.signature) {
      throw new Error('Missing license_data or signature in response');
    }

    // 3. Decrypt & Verify
    console.log('🔐 Decrypting license data...');
    const decrypted = (await decryptLicenseData(activateData.license_data, testMachineId)) as any;
    console.log('Decrypted Payload:', decrypted);

    // Note: Decrypted data has 'type' as integer index (0 for STANDARD) and no 'revoked' field (unless we add it to payload)
    // See: buildLicenseData in activate/route.ts
    if (decrypted.type !== 0) {
      throw new Error(
        `Decrypted data mismatch. Expected type 0 (STANDARD), got: ${decrypted.type}`
      );
    }
    console.log('✅ Activation verified!');

    // 4. Validate
    console.log('\n📡 Testing /api/license/validate...');
    const validateRes = await fetch(`${API_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: testKey,
        machine_id: testMachineId,
      }),
    });

    if (!validateRes.ok) throw new Error('Validation failed');
    const validateData = await validateRes.json();
    console.log('Validate Response:', validateData);
    if (!validateData.valid) throw new Error('Validation returned invalid');
    console.log('✅ Validation verified!');

    // 5. Deactivate
    console.log('\n📡 Testing /api/license/deactivate...');
    const deactivateRes = await fetch(`${API_URL}/api/license/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: testKey,
        machine_id: testMachineId,
      }),
    });

    if (!deactivateRes.ok) throw new Error('Deactivation failed');
    console.log('✅ Deactivation successful!');

    // Check DB
    const activationCheck = await prisma.activation.findFirst({
      where: { machineId: testMachineId, licenseId: user.licenses[0].id },
    });
    if (activationCheck) throw new Error('Activation still exists in DB!');
    console.log('✅ DB verified empty.');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await prisma.activation.deleteMany({ where: { licenseId: user.licenses[0].id } }); // safe check
    await prisma.license.delete({ where: { id: user.licenses[0].id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Done.');
    await prisma.$disconnect();
  }
}

main();
