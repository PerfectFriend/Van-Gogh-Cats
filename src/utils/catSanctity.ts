// Strict Unicode word-boundary Cat Sanctity validator: "Запрещено всё кроме котов"

const CAT_KEYWORD_RE =
  /(?<![\p{L}\p{N}_])(?:кот(?:а|у|ом|е|ы|ов|ам|ами|ах|ик\p{L}*|ёнок|ёнка|ёнку|ёнком|енок|енка|ят\p{L}*|ёнк\p{L}*)?|кош(?:ка|ки|ке|ку|кой|ек|кам|ками|ках|ечк\p{L}*)|кошач\p{L}*|мяу\p{L}*|мурлы(?:к\p{L}*|ч\p{L}*)|cats?|kittens?|kitty|kitties|felines?|tabby)(?![\p{L}\p{N}_])/iu;

const NON_CAT_KEYWORD_RE =
  /(?<![\p{L}\p{N}_])(?:собак(?:а|и|е|у|ой|ою|ам|ами|ах)?|щен(?:ок|ка|ку|ком|ке|ки|ков|кам|ками|ках|ят\p{L}*)|пес|пёс|пса|псу|псом|псы|дог|доги|догов|ретривер\p{L}*|лабрадор\p{L}*|овчарк\p{L}*|пудел\p{L}*|бульдог\p{L}*|корги|шпиц\p{L}*|мопс\p{L}*|dogs?|pupp(?:y|ies)|hounds?|canines?|retrievers?|corgis?|poodles?|bulldogs?|terriers?|chihuahuas?|husk(?:y|ies))(?![\p{L}\p{N}_])/iu;

export function hasExplicitCatMention(text: string): boolean {
  return CAT_KEYWORD_RE.test(text);
}

export function hasExplicitDogOnlyMention(text: string): boolean {
  return NON_CAT_KEYWORD_RE.test(text) && !CAT_KEYWORD_RE.test(text);
}

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
