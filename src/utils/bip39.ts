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

// SHA-256 Pin code hashing with random salt
export async function hashPinCode(pin: string, salt: string): Promise<string> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:vangogh_cat_guard`);
  const digest = await cryptoObj.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random salt for PIN
export function generateSalt(): string {
  const cryptoObj = getCrypto();
  const arr = new Uint8Array(16);
  cryptoObj.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
