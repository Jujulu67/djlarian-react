import sodium from 'libsodium-wrappers';

// ============================================================================
// INITIALIZATION
// ============================================================================
let sodiumReady = false;

/**
 * Initialise libsodium. Doit être appelé avant toute opération crypto.
 */
export async function ensureSodium(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
}

// ============================================================================
// ED25519 SIGNING (compatible avec libsodium C++)
// ============================================================================

/**
 * Signe un message avec la clé privée Ed25519.
 * Retourne la signature en hex (128 caractères).
 */
export async function signMessage(message: string): Promise<string> {
  await ensureSodium();

  const privateKeyHex = process.env.ED25519_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('ED25519_PRIVATE_KEY is not defined in environment variables');
  }

  const privateKey = sodium.from_hex(privateKeyHex);
  const messageBytes = sodium.from_string(message);

  // Signature détachée Ed25519 (64 bytes)
  const signature = sodium.crypto_sign_detached(messageBytes, privateKey);

  return sodium.to_hex(signature);
}

/**
 * Génère une nouvelle paire de clés Ed25519.
 * À utiliser UNE FOIS pour setup initial.
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  await ensureSodium();

  const keyPair = sodium.crypto_sign_keypair();
  return {
    publicKey: sodium.to_hex(keyPair.publicKey), // 64 chars hex (32 bytes)
    privateKey: sodium.to_hex(keyPair.privateKey), // 128 chars hex (64 bytes)
  };
}

// ============================================================================
// XCHACHA20-POLY1305 ENCRYPTION (compatible avec libsodium C++)
// ============================================================================

/**
 * Chiffre les données de licence avec XChaCha20-Poly1305-IETF.
 * Clé dérivée du machineId pour que seule cette machine puisse déchiffrer.
 *
 * Format de sortie: [nonce 24 bytes][ciphertext + auth tag 16 bytes]
 */
export async function encryptLicenseData(data: object, machineId: string): Promise<string> {
  await ensureSodium();

  // Clé = premiers 32 bytes du machineId (SHA-256 = 64 hex chars = 32 bytes)
  // On suppose que machineId est un hex string valide
  const keyHex = machineId.substring(0, 64);
  const key = sodium.from_hex(keyHex);

  // Nonce aléatoire (24 bytes pour XChaCha20)
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

  // Chiffrer avec XChaCha20-Poly1305-IETF (même algo que le plugin C++)
  const message = sodium.from_string(JSON.stringify(data));
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    null, // additional data (AAD)
    null, // secret nonce (non utilisé)
    nonce,
    key
  );

  // Format: [nonce (24 bytes)][ciphertext + auth tag]
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  // Retourner en base64
  return sodium.to_base64(combined, sodium.base64_variants.ORIGINAL);
}

/**
 * Déchiffre les données (Pour tests seulement - le vrai déchiffrement se fait en C++)
 */
export async function decryptLicenseData(base64Data: string, machineId: string): Promise<any> {
  await ensureSodium();

  const data = sodium.from_base64(base64Data, sodium.base64_variants.ORIGINAL);
  const nonce = data.slice(0, sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = data.slice(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

  const keyHex = machineId.substring(0, 64);
  const key = sodium.from_hex(keyHex);

  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    nonce,
    key
  );

  return JSON.parse(sodium.to_string(decrypted));
}

/**
 * Constantes exportées pour référence
 */
export const CRYPTO_CONSTANTS = {
  NONCE_SIZE: 24, // crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  KEY_SIZE: 32, // crypto_aead_xchacha20poly1305_ietf_KEYBYTES
  TAG_SIZE: 16, // crypto_aead_xchacha20poly1305_ietf_ABYTES
  SIGNATURE_SIZE: 64, // crypto_sign_BYTES
  PUBLIC_KEY_SIZE: 32, // crypto_sign_PUBLICKEYBYTES
};
