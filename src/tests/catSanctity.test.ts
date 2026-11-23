import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCatSanctity,
  hasExplicitCatMention,
  hasExplicitDogOnlyMention,
} from '../utils/catSanctity';

describe('Cat Sanctity Validator ("Запрещено всё кроме котов")', () => {
  test('approves prompts with Russian cat terms', () => {
    const validPrompts = [
      'Рыжий кот на террасе кафе в Арле',
      'Пушистая кошка спит под звездным небом',
      'Маленький котёнок среди подсолнухов',
      'Кошачий портрет маслом в технике импасто',
      'Котята ловят звездную пыль',
      'Кот на подсолнухах',
      'Котёнок спит',
      'Мурлыка у окна',
    ];

    for (const p of validPrompts) {
      const res = validateCatSanctity(p);
      assert.equal(res.isCat, true, `Expected "${p}" to be valid cat prompt`);
    }
  });

  test('approves prompts with English cat terms', () => {
    const validPrompts = [
      'Ginger cat under Starry Night in Arles',
      'Cute kitten sleeping in a basket of sunflowers',
      'Majestic feline with blue swirls',
      'Playful kitty chasing stars',
      'Tabby cat sitting on a yellow chair'
    ];

    for (const p of validPrompts) {
      const res = validateCatSanctity(p);
      assert.equal(res.isCat, true, `Expected "${p}" to be valid cat prompt`);
    }
  });

  test('rejects Russian and English substring false-positives without real cats', () => {
    const trapPrompts = [
      'Который читает письмо',
      'Котлета на тарелке',
      'Котёл с супом',
      'Мурал на стене',
      'Кошмар в Арле',
      'A catalog of paintings in Saint-Rémy',
      'Scatterplot of brushstrokes',
      'Которые смотрят на звёзды',
    ];

    for (const p of trapPrompts) {
      const res = validateCatSanctity(p);
      assert.equal(res.isCat, false, `Expected false-positive trap "${p}" to be rejected`);
      assert.equal(hasExplicitCatMention(p), false);
    }
  });

  test('rejects prompts without any cats', () => {
    const invalidPrompts = [
      'Пейзаж с кипарисами и мельницей',
      'Цветущий сад в Сен-Реми',
      'Ваза с двенадцатью подсолнухами',
      'Портрет доктора Гаше',
      'A beautiful sunset over wheat fields with ravens'
    ];

    for (const p of invalidPrompts) {
      const res = validateCatSanctity(p);
      assert.equal(res.isCat, false, `Expected "${p}" to be rejected`);
      assert.ok(res.reason, 'Must return a reason explaining the cat rule');
    }
  });

  test('rejects dog prompts if no cat is present', () => {
    const dogPrompts = [
      'Золотистый ретривер на ночной террасе',
      'Собака играет в подсолнухах',
      'Golden retriever dog under Starry Night',
      'Playful puppy in Arles'
    ];

    for (const p of dogPrompts) {
      const res = validateCatSanctity(p);
      assert.equal(res.isCat, false, `Expected dog prompt "${p}" to be rejected`);
      assert.equal(hasExplicitDogOnlyMention(p), true);
    }
    assert.equal(hasExplicitDogOnlyMention('Кот и собака на террасе'), false);
  });

  test('approves cat even if title contains additional context', () => {
    const res = validateCatSanctity('Звездная ночь', 'Портрет кота');
    assert.equal(res.isCat, true);
  });
});

