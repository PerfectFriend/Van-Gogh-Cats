// BIP-39 Standard Implementation for Web Crypto
// 12-word mnemonic generation, validation, checksum and key derivation
import { BIP39_WORDLIST } from './bip39Words';
export { BIP39_WORDLIST };

// Helper to convert byte array to binary bit string
function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += bytes[i].toString(2).padStart(8, '0');
  }
  return binary;
}

// Helper to get crypto implementation in both browser and Node.js
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return (globalThis as unknown as { crypto: Crypto }).crypto;
}

// Generate cryptographically secure 12-word BIP-39 mnemonic
export async function generateBip39Mnemonic(): Promise<string> {
  const cryptoObj = getCrypto();
  // 12 words = 128 bits entropy + 4 bits checksum = 132 bits / 11 = 12 words
  const entropy = new Uint8Array(16);
  cryptoObj.getRandomValues(entropy);

  // Compute SHA-256 hash of entropy for checksum
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', entropy);
  const hashBytes = new Uint8Array(hashBuffer);

  const entropyBits = bytesToBinaryString(entropy);
  const hashBits = bytesToBinaryString(hashBytes);

  // First 4 bits of hash is the checksum
  const checksumBits = hashBits.slice(0, 4);
  const totalBits = entropyBits + checksumBits;

  // Split into 12 chunks of 11 bits
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    const chunk = totalBits.slice(i * 11, (i + 1) * 11);
    const index = parseInt(chunk, 2);
    words.push(BIP39_WORDLIST[index]);
  }

  return words.join(' ');
}

// Validate a 12-word mnemonic according to BIP-39 rules
export async function validateBip39Mnemonic(mnemonic: string): Promise<{ valid: boolean; error?: string }> {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) {
    return { valid: false, error: 'Мнемоническая фраза должна содержать ровно 12 слов.' };
  }

  let totalBits = '';
  for (const word of words) {
    const index = BIP39_WORDLIST.indexOf(word);
    if (index === -1) {
      return { valid: false, error: `Неизвестное слово из словаря BIP-39: "${word}". Проверьте правописание.` };
    }
    totalBits += index.toString(2).padStart(11, '0');
  }

  // Split into 128 bits entropy and 4 bits checksum
  const entropyBits = totalBits.slice(0, 128);
  const checksumBits = totalBits.slice(128);

  const entropyBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
  }

  const cryptoObj = getCrypto();
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', entropyBytes);
  const hashBytes = new Uint8Array(hashBuffer);
  const computedChecksum = bytesToBinaryString(hashBytes).slice(0, 4);

  if (computedChecksum !== checksumBits) {
    return { valid: false, error: 'Контрольная сумма фразы не совпадает. Проверьте порядок слов.' };
  }

  return { valid: true };
}

// Convert Mnemonic to Seed / Key Identity (PBKDF2 via Web Crypto)
export async function mnemonicToSeedHex(mnemonic: string, saltModifier = ''): Promise<string> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const normalized = mnemonic.trim().toLowerCase();
  const passphraseBytes = enc.encode(normalized);
  const saltBytes = enc.encode('mnemonic' + saltModifier);

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 2048,
      hash: 'SHA-512'
    },
    keyMaterial,
    512
  );

  const array = Array.from(new Uint8Array(derivedBits));
  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}

// PBKDF2-SHA256 PIN code hashing (100,000 iterations) with random salt -> 64 lowercase hex chars
export async function hashPinCode(pin: string, salt: string): Promise<string> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(`${pin}:vangogh_cat_guard`),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Domain-separated profile ID derived via SHA-256 over the BIP-39 seed hex (never exposes raw seed prefix)
export async function deriveProfileIdFromSeedHex(seedHex: string): Promise<string> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const digest = await cryptoObj.subtle.digest(
    'SHA-256',
    enc.encode(`vangogh_cat_profile_id:${seedHex}`)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return 'cat_' + hex.slice(0, 16);
}

export interface EncryptedPassphrasePayload {
  v: 1;
  alg: 'PBKDF2-SHA256/AES-GCM-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const ARCHIVE_KDF_ITERATIONS = 600000;

export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string
): Promise<EncryptedPassphrasePayload> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Пароль архива должен содержать минимум 6 символов.');
  }
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  cryptoObj.getRandomValues(salt);
  cryptoObj.getRandomValues(iv);

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ARCHIVE_KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintext)
  );

  return {
    v: 1,
    alg: 'PBKDF2-SHA256/AES-GCM-256',
    iterations: ARCHIVE_KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptWithPassphrase(
  payload: EncryptedPassphrasePayload,
  passphrase: string
): Promise<string> {
  if (!passphrase) {
    throw new Error('Введите пароль для расшифровки архива.');
  }
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: payload.iterations || ARCHIVE_KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await cryptoObj.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
    aesKey,
    ciphertext as Uint8Array<ArrayBuffer>
  );

  return new TextDecoder().decode(decrypted);
}

// Generate random salt for PIN
export function generateSalt(): string {
  const cryptoObj = getCrypto();
  const arr = new Uint8Array(16);
  cryptoObj.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
