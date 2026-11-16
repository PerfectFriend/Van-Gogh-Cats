import { StylePreset } from '../types';

export const VAN_GOGH_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'starry_night',
    name: 'Звёздная ночь (Starry Night)',
    titleEn: 'Starry Night Impasto',
    description: 'Вихри кобальтового синего, золотые звёздные спирали и рельефный пастозный мазок (Сен-Реми, 1889)',
    promptModifier: 'in the unmistakable post-impressionist oil painting style of Vincent van Gogh Starry Night, thick impasto visible brushstrokes, swirling cobalt blue and gold celestial night sky, dynamic emotional energy, oil on canvas texture',
    colors: ['#0047AB', '#FFD700', '#120A8F', '#1E90FF', '#FFF8DC'],
    samplePrompt: 'Пушистый рыжий котик сидит на подоконнике и заворожённо смотрит на вихри звёздного неба в Арле'
  },
  {
    id: 'sunflowers',
    name: 'Подсолнухи (Sunflowers)',
    titleEn: 'Arles Yellow & Sunflowers',
    description: 'Тёплая симфония жёлтой охры, хромового золота и фактурных мазков (Арль, 1888)',
    promptModifier: 'in the warm post-impressionist oil painting style of Vincent van Gogh Sunflowers series, rich ochre and chrome yellow palette, thick sculpted paint strokes, rustic ceramic vase, vibrant warm lighting, oil canvas texture',
    colors: ['#EAA221', '#D4AF37', '#8B5A2B', '#556B2F', '#F4A460'],
    samplePrompt: 'Очаровательный рыжий котёнок сладко спит среди большой вазы с золотыми подсолнухами'
  },
  {
    id: 'cafe_terrace',
    name: 'Ночное кафе (Café Terrace at Night)',
    titleEn: 'Café Terrace at Night',
    description: 'Контраст тёплых жёлтых фонарей кафе и глубокого сапфирового неба (Арль, 1888)',
    promptModifier: 'in the style of Vincent van Gogh Cafe Terrace at Night in Arles, vivid contrast of warm glowing yellow gas lamps against a deep cobalt blue starry evening sky, thick expressive oil brushstrokes, charming 19th-century French street atmosphere',
    colors: ['#FFC107', '#0A192F', '#1E3A8A', '#F59E0B', '#B45309'],
    samplePrompt: 'Чёрно-белый котик-джентльмен сидит за столиком кафе в ночном Арле под светом фонарей'
  },
  {
    id: 'irises',
    name: 'Ирисы (Irises & Garden)',
    titleEn: 'Irises & Botanical Gardens',
    description: 'Волнистые изумрудно-зелёные линии, сапфировые ирисы и живой садовый свет (Сен-Реми, 1889)',
    promptModifier: 'in Vincent van Gogh Irises oil painting style, lush emerald green foliage, violet-blue iris blossoms, rhythmic flowing outlines, Japanese woodblock influence, vibrant botanical post-impressionist texture',
    colors: ['#4B0082', '#2E8B57', '#9370DB', '#8FBC8F', '#FFD700'],
    samplePrompt: 'Белый пушистый котик охотится за бабочкой среди цветущих синих ирисов в саду'
  },
  {
    id: 'self_portrait',
    name: 'Соломенная шляпа (Straw Hat Portrait)',
    titleEn: 'Self-Portrait in Straw Hat',
    description: 'Концентрические и расходящиеся штрихи, соломенные акценты и пронзительный взгляд (Париж, 1887)',
    promptModifier: 'in Vincent van Gogh self-portrait style with a straw hat, energetic short directional brushstrokes radiating from the center, expressive glowing eyes, warm ochre and blue contrasting tones, impasto oil portrait on canvas',
    colors: ['#D2B48C', '#2F4F4F', '#CD853F', '#4682B4', '#8B4513'],
    samplePrompt: 'Благородный портрет котика в соломенной шляпе художника с палитрой и кистью в лапке'
  },
  {
    id: 'wheatfield',
    name: 'Пшеничное поле с кипарисами (Wheat Field)',
    titleEn: 'Wheat Field with Cypresses',
    description: 'Бушующая золотая рожь, тёмно-зелёные пламяобразные кипарисы и белые облака (1889)',
    promptModifier: 'in Vincent van Gogh Wheat Field with Cypresses style, swirling white clouds, flame-like dark green cypress trees, golden wheat field swaying in the wind, thick dynamic oil brushstrokes',
    colors: ['#DAA520', '#1B4D3E', '#87CEEB', '#F5F5DC', '#556B2F'],
    samplePrompt: 'Котик гуляет по золотому пшеничному полю рядом с высокими кипарисами в ветреный день'
  },
  {
    id: 'klimt_golden',
    name: 'Густав Климт (Золотой модерн & Поцелуй)',
    titleEn: 'Gustav Klimt Golden Art Nouveau',
    description: 'Мерцающее сусальное золото, орнаментальные мозаичные спирали и венский модерн (Вена, 1907)',
    promptModifier: 'in Gustav Klimt golden phase oil painting style, shimmering gold leaf foil textures, intricate Byzantine mosaic spiral patterns, decorative Art Nouveau floral elements, warm opulent golden amber palette, oil and gold on canvas',
    colors: ['#D4AF37', '#FFD700', '#2E1503', '#B8860B', '#E5C158'],
    samplePrompt: 'Два чёрных котика, один угольный а второй в смокинге с белой манишкой, уютно дремлют в объятиях золотых спиралей и орнаментов Климта'
  },
  {
    id: 'monet_waterlilies',
    name: 'Клод Моне (Кувшинки и Живерни)',
    titleEn: 'Claude Monet Water Lilies Impressionism',
    description: 'Мягкие переливы утреннего света на воде, цветущие кувшинки и японский мостик (Живерни, 1916)',
    promptModifier: 'in Claude Monet French impressionism plein air oil painting style, soft dappled morning sunlight reflections on water, blooming pink and white water lilies, lush weeping willows, pastel emerald and violet-blue loose brushwork',
    colors: ['#7EA172', '#C7CEEA', '#F4ACB7', '#4A6984', '#E8F5E9'],
    samplePrompt: 'Любопытный чёрный котик с белой манишкой осторожно трогает лапкой кувшинку в пруду Живерни'
  },
  {
    id: 'hokusai_wave',
    name: 'Кацусика Хокусай (Японская гравюра Укиё-э)',
    titleEn: 'Hokusai Japanese Woodblock Ukiyo-e',
    description: 'Глубокий берлинский синий (прусский индиго), динамичные гребни волн и эстетика гравюры Эдо',
    promptModifier: 'in traditional Japanese woodblock print ukiyo-e style by Katsushika Hokusai, Prussian blue wave textures, graceful calligraphic ink outlines, mount Fuji in background, washi paper fibrous texture, authentic antique Edo woodprint',
    colors: ['#0C2340', '#F7F4EA', '#4A777A', '#C25953', '#8FA89B'],
    samplePrompt: 'Два отважных котика в традиционной деревянной лодке любуются Большой волной в Канагаве'
  },
  {
    id: 'vermeer_pearl',
    name: 'Ян Вермеер (Девушка с жемчужной серёжкой)',
    titleEn: 'Johannes Vermeer Chiaroscuro & Pearl',
    description: 'Магическая голландская светотень, ультрамариновая чалма, мягкий блеск жемчуга и бархат',
    promptModifier: 'in Johannes Vermeer 17th-century Dutch master oil painting style, exquisite soft directional chiaroscuro lighting, luminous pearl earring, deep natural lapis lazuli ultramarine and ochre turban fabric, dark contemplative canvas background',
    colors: ['#1B263B', '#E0A96D', '#778DA9', '#E0E1DD', '#0D1B2A'],
    samplePrompt: 'Портрет элегантного чёрного кота в ультрамариновой чалме и с мерцающей жемчужной серёжкой в ушке'
  },
  {
    id: 'renoir_terrace',
    name: 'Пьер Огюст Ренуар (Завтрак гребцов)',
    titleEn: 'Pierre-Auguste Renoir Sunlit Impressionism',
    description: 'Тёплый солнечный парижский полдень, мерцающие блики сквозь листву и радостная атмосфера Монмартра',
    promptModifier: 'in Pierre-Auguste Renoir impressionist painting style, warm sun-dappled terrace lighting, vibrant Parisian convivial atmosphere, soft feathery brushstrokes, luminous skin and fur textures, cheerful French cafe colors',
    colors: ['#FF9E80', '#FFE082', '#80CBC4', '#90CAF9', '#FFAB91'],
    samplePrompt: 'Два счастливых котика сидят на коленях у дамы на солнечной веранде парижского кафе'
  }
];

export const MODEL_OPTIONS = [
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    badge: 'Рекомендуемый (Быстрый & Точный)',
    description: 'Официальная модель Google для генерации художественных образов в стиле Ван Гога'
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    badge: 'HD Качество',
    description: 'Максимальная детализация мазков импасто и живописных текстур'
  }
];
