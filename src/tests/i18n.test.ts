import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS, SUPPORTED_LANGUAGES, detectSystemLanguage } from '../utils/i18n';
import { SupportedLanguage } from '../i18n/types';

describe('i18n Top-10 Languages Localization Integrity', () => {
  const allCodes: SupportedLanguage[] = ['ru', 'en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ar', 'hi'];

  test('all 10 world languages are registered with metadata', () => {
    assert.equal(SUPPORTED_LANGUAGES.length, 10, 'Must support exactly 10 languages');
    for (const code of allCodes) {
      const meta = SUPPORTED_LANGUAGES.find((m) => m.code === code);
      assert.ok(meta, `Language metadata must exist for "${code}"`);
      assert.ok(meta.name, `Language name must exist for "${code}"`);
      assert.ok(meta.flag, `Flag icon must exist for "${code}"`);
    }
  });

  test('every language dictionary contains complete required keys', () => {
    const criticalKeys = [
      'appTitle',
      'appSubtitle',
      'complaintModalTitle',
      'complaintAuthor',
      'complaintUnknownAuthor',
      'complaintProtectionDesc',
      'complaintReasonLabel',
      'complaintCommonReasons',
      'complaintCustomReasonLabel',
      'complaintCustomReasonPlaceholder',
      'complaintCancelBtn',
      'complaintSubmitBtn',
      'complaintAlertSuccess',
      'p2pHubTitle',
      'p2pDisputesTitle',
      'androidModalTitle',
      'ubuntuModalTitle',
      'quickPrompts',
      'close',
      'cancel',
    ] as const;

    for (const code of allCodes) {
      const dict = TRANSLATIONS[code];
      assert.ok(dict, `Translation dictionary must be defined for "${code}"`);

      for (const key of criticalKeys) {
        assert.ok(
          (dict as any)[key] !== undefined,
          `Key "${key}" must be defined in "${code}" dictionary`
        );
      }

      // Verify complaintCommonReasons is non-empty array
      assert.ok(
        Array.isArray(dict.complaintCommonReasons),
        `complaintCommonReasons must be an array in "${code}"`
      );
      assert.ok(
        dict.complaintCommonReasons.length >= 2,
        `complaintCommonReasons must have at least 2 options in "${code}"`
      );

      // Verify quickPrompts is non-empty array
      assert.ok(
        Array.isArray(dict.quickPrompts),
        `quickPrompts must be an array in "${code}"`
      );
      assert.ok(
        dict.quickPrompts.length >= 3,
        `quickPrompts must have at least 3 prompts in "${code}"`
      );
    }
  });

  test('detectSystemLanguage returns fallback safely in non-browser context', () => {
    const fallback = detectSystemLanguage();
    assert.ok(fallback === 'ru' || fallback === 'en');
  });
});
