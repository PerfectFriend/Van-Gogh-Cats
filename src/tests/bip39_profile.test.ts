import test from 'node:test';
import assert from 'node:assert';
import { generateBip39Mnemonic, validateBip39Mnemonic, BIP39_WORDLIST, hashPinCode } from '../utils/bip39';

// Setup Web Crypto API mock in node environment if needed
if (!globalThis.crypto) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto as unknown as Crypto;
}

test('BIP-39 Mnemonic Generation & Validation', async (t) => {
  await t.test('wordlist contains exactly 2048 words', () => {
    assert.strictEqual(BIP39_WORDLIST.length, 2048);
    assert.strictEqual(BIP39_WORDLIST[0], 'abandon');
    assert.strictEqual(BIP39_WORDLIST[2047], 'zoo');
  });

  await t.test('generates valid 12-word mnemonic with valid checksum', async () => {
    const mnemonic = await generateBip39Mnemonic();
    const words = mnemonic.split(' ');
    assert.strictEqual(words.length, 12);
    
    // Each word exists in official list
    for (const w of words) {
      assert.ok(BIP39_WORDLIST.includes(w), `Word ${w} must be in BIP-39 wordlist`);
    }

    // Validation passes
    const validation = await validateBip39Mnemonic(mnemonic);
    assert.strictEqual(validation.valid, true);
  });

  await t.test('rejects mnemonic with wrong word count', async () => {
    const invalid = 'abandon ability able';
    const res = await validateBip39Mnemonic(invalid);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('12 слов'));
  });

  await t.test('rejects mnemonic with non-BIP39 words', async () => {
    const invalid = 'abandon ability able about above absent absorb abstract absurd abuse access nonexistingwordcat';
    const res = await validateBip39Mnemonic(invalid);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('Неизвестное слово'));
  });

  await t.test('rejects mnemonic with altered checksum / scrambled order', async () => {
    const mnemonic = await generateBip39Mnemonic();
    const words = mnemonic.split(' ');
    // Deterministically alter the 4-bit checksum embedded in the last word (XOR bottom 4 bits)
    const lastIdx = BIP39_WORDLIST.indexOf(words[11]);
    const alteredLastWord = BIP39_WORDLIST[lastIdx ^ 1];
    const invalidMnemonic = [...words.slice(0, 11), alteredLastWord].join(' ');
    const res = await validateBip39Mnemonic(invalidMnemonic);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('Контрольная сумма'));
  });

  await t.test('hashPinCode produces consistent SHA-256 digest', async () => {
    const pin = '1234';
    const salt = 'abcdef0123456789';
    const hash1 = await hashPinCode(pin, salt);
    const hash2 = await hashPinCode(pin, salt);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);

    const hashDiff = await hashPinCode('4321', salt);
    assert.notStrictEqual(hash1, hashDiff);
  });
});
