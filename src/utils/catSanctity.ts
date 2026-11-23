// Strict Unicode word-boundary Cat Sanctity validator: "Запрещено всё кроме котов"

const CAT_KEYWORD_RE =
  /(?:^|[^\p{L}\p{N}_])(кот\p{L}*|кошк\p{L}*|котик\p{L}*|котён\p{L}*|котен\p{L}*|кошач\p{L}*|котят\p{L}*|мяу\p{L}*|мурлы\p{L}*|cat|cats|kitten|kittens|feline|felines|kitty|kitties|tabby)(?=$|[^\p{L}\p{N}_])/iu;

const NON_CAT_KEYWORD_RE =
  /(?:^|[^\p{L}\p{N}_])(собак\p{L}*|щенок\p{L}*|щенк\p{L}*|пес|пёс|пса|псу|псом|псы|дог|доги|догов|dog|dogs|puppy|puppies|hound|hounds|canine|canines|chihuahua|husky)(?=$|[^\p{L}\p{N}_])/iu;

export function validateCatSanctity(
  prompt: string,
  title?: string
): { isCat: boolean; reason?: string } {
  const combined = `${prompt || ''} ${title || ''}`.trim();

  const hasCat = CAT_KEYWORD_RE.test(combined);
  const hasDog = NON_CAT_KEYWORD_RE.test(combined);

  if (!hasCat) {
    return {
      isCat: false,
      reason: hasDog
        ? 'Обнаружены несоответствующие животные. В галерее разрешены исключительно котики.'
        : 'В децентрализованной сети Ван Гога действует строгое правило: картина ОБЯЗАТЕЛЬНО должна изображать кота или кошку!',
    };
  }

  return { isCat: true };
}
