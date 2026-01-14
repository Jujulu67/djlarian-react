import { generateKeyPair, ensureSodium } from '../src/lib/license/crypto';

async function main() {
  await ensureSodium();
  const keys = await generateKeyPair();

  console.log('='.repeat(60));
  console.log('ED25519 KEY PAIR GENERATED (libsodium)');
  console.log('='.repeat(60));
  console.log();
  console.log('PUBLIC KEY (64 chars - mettre dans le plugin C++):');
  console.log(keys.publicKey);
  console.log();
  console.log('PRIVATE KEY (128 chars - mettre dans .env.local):');
  console.log(`ED25519_PRIVATE_KEY=${keys.privateKey}`);
  console.log();
  console.log('='.repeat(60));
  console.log('⚠️  SAUVEGARDE LA CLÉ PRIVÉE EN LIEU SÛR !');
  console.log('='.repeat(60));
}

main().catch(console.error);
