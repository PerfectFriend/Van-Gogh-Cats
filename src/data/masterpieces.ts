import { Artwork } from '../types';

import vanGoghStarryCat from '../assets/images/van_gogh_cat_1785425794750.jpg';
import vanGoghSunflowerCat from '../assets/images/sunflower_kitty_1785425809103.jpg';
import vanGoghCafeCat from '../assets/images/cafe_terrace_cat_1785425822088.jpg';
import vanGoghAlmondCat from '../assets/images/almond_blossom_cat_1789317351101.jpg';
import vanGoghBedroomCat from '../assets/images/bedroom_arles_cat_1789317364061.jpg';
import vanGoghWheatfieldCat from '../assets/images/wheatfield_cat_1789317378784.jpg';

// The Two Black Cats Collection (Pure Black & Stylish Tuxedo Cat)
import twoCatsStarry from '../assets/images/two_black_cats_starry_1789832553888.jpg';
import twoCatsCafe from '../assets/images/two_black_cats_cafe_1789832567987.jpg';
import twoCatsSunflowers from '../assets/images/two_cats_sunflowers_1789832581939.jpg';
import twoCatsAlmond from '../assets/images/two_cats_almond_1789832594254.jpg';
import twoCatsBedroom from '../assets/images/two_cats_bedroom_1789832606798.jpg';
import twoCatsWheatfield from '../assets/images/two_cats_wheatfield_1789832618041.jpg';
import twoCatsIrises from '../assets/images/two_cats_irises_1789832630987.jpg';
import twoCatsVineyard from '../assets/images/two_cats_vineyard_1789832644644.jpg';
import twoCatsOlives from '../assets/images/two_cats_olives_1789832655854.jpg';
import twoCatsRhone from '../assets/images/two_cats_rhone_1789832668004.jpg';

export const INITIAL_MASTERPIECES: Artwork[] = [
  {
    id: 'vg_two_cats_starry',
    title: 'Два чёрных кота под звёздным небом',
    titleEn: 'Two Black Cats under Starry Night Sky',
    imageUrl: twoCatsStarry,
    prompt: 'A masterpiece oil painting in the style of Vincent van Gogh Starry Night. Two friendly cats sitting close together on a rustic stone wall: one is completely solid coal black with glowing amber gold eyes, and the other is a stylish black tuxedo cat with a white patch on the lower neck and white on the belly between hind legs, with emerald green eyes. Behind them, an emotional swirling cobalt blue and gold night sky with luminous stars and a crescent moon, thick textured impasto oil paint brushstrokes.',
    style: 'Звёздная ночь (Starry Night)',
    year: 'Сен-Реми, 1889 (AI Реинкарнация)',
    description: 'Два верных спутника на каменной ограде: угольно-чёрный созерцатель с янтарным взглядом и элегантный джентльмен в чёрном фраке с белой манишкой на шее и белым пятнышком на животе. Над ними кружатся золотые спирали космической ночи.',
    palette: [
      { hex: '#0B132B', name: 'Глубокий индиго' },
      { hex: '#1C2541', name: 'Ночной кобальт' },
      { hex: '#F4A261', name: 'Золото звёзд' },
      { hex: '#E76F51', name: 'Тёплый янтарь глаз' },
      { hex: '#FFFFFF', name: 'Белый шёлк манишки' }
    ],
    brushstrokeNote: 'Круговые динамические мазки ночного неба, контрастирующие с бархатной мягкостью кошачьей шерсти.',
    aspectRatio: '4:3',
    createdAt: 1789832553888,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 582
  },
  {
    id: 'vg_two_cats_cafe',
    title: 'Два чёрных кота в ночном кафе в Арле',
    titleEn: 'Two Black Cats at Café Terrace at Night',
    imageUrl: twoCatsCafe,
    prompt: 'A museum oil painting in the style of Vincent van Gogh Cafe Terrace at Night in Arles. Sitting together warmly on the cobblestone patio next to a small candlelit cafe table are two cats: one is pure solid velvet black with glowing amber eyes, and the second cat is a dapper black cat with a white patch on the lower throat bib and white on the tummy between the rear legs, like a tuxedo. Warm glowing yellow gas lantern light contrasts against a deep sapphire starry sky, thick expressive impasto brushstrokes.',
    style: 'Ночное кафе (Café Terrace at Night)',
    year: 'Площадь Форума, Арль, 1888',
    description: 'Уютный вечер на террасе. Полностью чёрный кот и его изысканный собрат с белой манишкой и пятнышком на животике греются в тёплом свете керосинового фонаря под сапфировым звёздным куполом.',
    palette: [
      { hex: '#FFB703', name: 'Свет газового фонаря' },
      { hex: '#023E8A', name: 'Сапфировая ночь' },
      { hex: '#FB8500', name: 'Охра мостовой' },
      { hex: '#14213D', name: 'Чёрный бархат' },
      { hex: '#E5E5E5', name: 'Белый смокинг' }
    ],
    brushstrokeNote: 'Ритмичные направленные мазки брусчатки и мягкие световые ореолы вокруг террасы.',
    aspectRatio: '16:9',
    createdAt: 1789832567987,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 495
  },
  {
    id: 'vg_two_cats_sunflowers',
    title: 'Два чёрных кота и двенадцать подсолнухов',
    titleEn: 'Two Black Cats Beside Sunflowers',
    imageUrl: twoCatsSunflowers,
    prompt: 'A vibrant oil painting in the style of Vincent van Gogh Sunflowers in Arles. Two cute cats nestled together beside a big ceramic terracotta vase overflowing with radiant golden and ochre sunflowers: one cat is completely pitch black with curious yellow eyes, and the second cat is black with a neat white patch on the lower neck chest and a white spot on the belly between its back paws. Rich yellow, golden amber, and warm rustic canvas colors, textured thick post-impressionist brushwork.',
    style: 'Подсолнухи (Sunflowers)',
    year: 'Жёлтый дом, Арль, 1888',
    description: 'Гимн солнечному теплу и дружбе. Угольный кот и смокинговый франт с белой манишкой прижались друг к другу возле массивной вазы с золотистыми подсолнухами, воплощающими душевную благодарность.',
    palette: [
      { hex: '#D4A373', name: 'Терракота вазы' },
      { hex: '#CCD5AE', name: 'Оливковый стебель' },
      { hex: '#FAEDCD', name: 'Тёплый фон Жёлтого дома' },
      { hex: '#2B2D42', name: 'Угольный мех' },
      { hex: '#FDF0D5', name: 'Белая грудка' }
    ],
    brushstrokeNote: 'Рельефная лепка лепестков густой краской (пастозный слой) и мягкая штриховка пушистых котиков.',
    aspectRatio: '4:3',
    createdAt: 1789832581939,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 438
  },
  {
    id: 'vg_two_cats_almond',
    title: 'Два чёрных котика на ветви цветущего миндаля',
    titleEn: 'Two Black Cats on Blossoming Almond Branch',
    imageUrl: twoCatsAlmond,
    prompt: 'Masterpiece oil painting in the style of Vincent van Gogh Almond Blossoms 1890. Resting peacefully together on a gnarled, dark blossoming almond tree branch are two adorable cats: one is sleek solid midnight black with amber eyes, and the other is a black cat with a clean white patch under the chin/neck and white on the tummy between the hind legs, dressed like in a tuxedo. Soft turquoise blue sky background, delicate white flowers with red stamens, thick sculptural impasto oil paint texture.',
    style: 'Цветущий миндаль (Almond Blossom)',
    year: 'Сен-Реми, 1890',
    description: 'Весеннее пробуждение природы. Два черных кота отдыхают на изогнутой ветви среди белоснежных цветов миндаля на фоне чистого бирюзового неба, как на старинной японской гравюре.',
    palette: [
      { hex: '#2A9D8F', name: 'Бирюзовый Сен-Реми' },
      { hex: '#264653', name: 'Тёмная кора ветви' },
      { hex: '#E76F51', name: 'Охра тычинок' },
      { hex: '#F8F9FA', name: 'Лепесток миндаля' },
      { hex: '#111111', name: 'Полночный чёрный' }
    ],
    brushstrokeNote: 'Тонкие графичные контуры ветвей в сочетании с пастозными скульптурными лепестками.',
    aspectRatio: '4:3',
    createdAt: 1789832594254,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 512
  },
  {
    id: 'vg_two_cats_bedroom',
    title: 'Два чёрных котика в спальне Арля',
    titleEn: 'Two Black Cats in the Bedroom in Arles',
    imageUrl: twoCatsBedroom,
    prompt: 'A cozy oil painting in the style of Vincent van Gogh Bedroom in Arles. Two cats sleeping together peacefully curled up on the scarlet red blanket of the wooden bed: one cat is solid velvety black, and the companion cat is black with a distinctive white chest bib patch and a white patch on the lower belly between the rear legs. Warm lilac walls, rustic yellow chairs and green shutters, bold post-impressionist perspectives and thick brushstrokes.',
    style: 'Спальня в Арле (Bedroom in Arles)',
    year: 'Жёлтый дом, Арль, 1888',
    description: 'Мир и безмятежность домашнего очага. Чёрный кот и его стильный друг в смокинге сладко спят в обнимку на алом покрывале в знаменитой комнате с лиловыми стенами и жёлтой мебелью.',
    palette: [
      { hex: '#9B5DE5', name: 'Лиловая стена' },
      { hex: '#F15BB5', name: 'Алое покрывало' },
      { hex: '#FEE440', name: 'Соломенный стул' },
      { hex: '#00F5D4', name: 'Зелёные ставни' },
      { hex: '#0F0F0F', name: 'Глубокий чёрный' }
    ],
    brushstrokeNote: 'Чистые плоскости насыщенного цвета, очерченные уверенными тёмными контурными мазками.',
    aspectRatio: '4:3',
    createdAt: 1789832606798,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 471
  },
  {
    id: 'vg_two_cats_wheatfield',
    title: 'Два чёрных котика в пшеничном поле с кипарисами',
    titleEn: 'Two Black Cats in Wheat Field with Cypresses',
    imageUrl: twoCatsWheatfield,
    prompt: 'Dramatic oil painting in the style of Vincent van Gogh Wheat Field with Cypresses 1889. Two cats walking side by side through swaying golden ripe wheat: one cat is completely jet black with glowing eyes, and the other cat is black with a sharp white patch at the lower neck and white on the tummy between the hind paws, stylish like a gentleman. In the background, swirling turbulent white clouds and a tall flame-like emerald cypress tree, heavy expressive impasto brushstrokes.',
    style: 'Пшеничное поле (Wheat Field with Cypresses)',
    year: 'Сен-Реми, 1889',
    description: 'Два грациозных кошачьих силуэта шествуют сквозь шуршащие золотые волны поспевающей ржи. Вдали высится кипарис-пламя, а небо наполнено порывами провансальского мистраля.',
    palette: [
      { hex: '#EE9B00', name: 'Зрелая рожь' },
      { hex: '#0A2E20', name: 'Изумрудный кипарис' },
      { hex: '#005F73', name: 'Небесный ультрамарин' },
      { hex: '#101010', name: 'Смоляной чёрный' },
      { hex: '#FFFFFF', name: 'Белая манишка' }
    ],
    brushstrokeNote: 'Волнообразные мазки мастихином, передающие трепет колосьев и динамику ветра.',
    aspectRatio: '16:9',
    createdAt: 1789832618041,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 539
  },
  {
    id: 'vg_two_cats_irises',
    title: 'Два чёрных котика в саду ирисов',
    titleEn: 'Two Black Cats among Irises',
    imageUrl: twoCatsIrises,
    prompt: 'An elegant oil painting in the style of Vincent van Gogh Irises 1889. Two curious cats sitting amidst lush deep violet-blue irises and curving emerald leaves: one cat is pure solid coal black with golden eyes, and the other is a black cat with a white bowtie patch on the lower throat and white on the lower abdomen between hind legs. Warm terracotta soil, vibrant jewel tones, Japanese woodblock influence and thick painterly impasto strokes.',
    style: 'Ирисы (Irises & Garden)',
    year: 'Сен-Реми, 1889',
    description: 'Контраст глубоких черных силуэтов и пышных фиолетово-синих ирисов больничного сада Сен-Поль. Белая манишка смокингового кота светится на фоне сочной изумрудной листвы.',
    palette: [
      { hex: '#3A0CA3', name: 'Ирис ультрамарин' },
      { hex: '#4361EE', name: 'Васильковый лепесток' },
      { hex: '#2D6A4F', name: 'Изумрудный лист' },
      { hex: '#D08C5C', name: 'Терракотовая глина' },
      { hex: '#080808', name: 'Глубокий уголь' }
    ],
    brushstrokeNote: 'Пластичные изгибы стеблей и плотные масляные фактуры цветочных бутонов.',
    aspectRatio: '4:3',
    createdAt: 1789832630987,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 466
  },
  {
    id: 'vg_two_cats_vineyard',
    title: 'Два чёрных кота в Красном винограднике',
    titleEn: 'Two Black Cats in the Red Vineyard at Arles',
    imageUrl: twoCatsVineyard,
    prompt: 'An atmospheric post-impressionist oil painting in the style of Vincent van Gogh The Red Vineyard at Arles. Two feline companions on the golden dirt path: one is an all-black cat with bright yellow eyes, and the second is a tuxedo-style black cat with a white patch under the throat and white on the tummy between its hind legs. Around them, vineyard leaves glowing in fiery crimson, orange and violet under a blazing golden sunset sun, thick textured impasto oil paint on canvas.',
    style: 'Красный виноградник в Арле',
    year: 'Арль, ноябрь 1888',
    description: 'Единственная картина, проданная при жизни Винсента, в новом кошачьем прочтении. Огненные краски заката озаряют тропинку, по которой неспешно ступают угольный кот и его спутник во фраке.',
    palette: [
      { hex: '#9E2A2B', name: 'Винный багрянец' },
      { hex: '#E09F3E', name: 'Золото заката' },
      { hex: '#540B0E', name: 'Гранатовый лист' },
      { hex: '#FFF3B0', name: 'Закатный диск солнца' },
      { hex: '#1A1A1A', name: 'Бархатный силуэт' }
    ],
    brushstrokeNote: 'Горизонтальные густые мазки света и тени, передающие ослепительный вечерний жар.',
    aspectRatio: '16:9',
    createdAt: 1789832644644,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 521
  },
  {
    id: 'vg_two_cats_olives',
    title: 'Два чёрных кота в оливковой роще',
    titleEn: 'Two Black Cats in the Olive Grove',
    imageUrl: twoCatsOlives,
    prompt: 'A lyrical oil painting in the style of Vincent van Gogh Olive Trees with Yellow Sky and Sun. Two playful cats perched on the swirling roots of a gnarly ancient olive tree: one is completely velvet black with glowing amber gaze, and the second is a classy black cat with white lower neck patch and white lower belly between the rear legs. Shimmering silver-green and blue-gray olive foliage, expressive rhythmic undulating brushstrokes, warm sunlit ground.',
    style: 'Оливковые деревья (Olive Trees)',
    year: 'Сен-Реми, 1889',
    description: 'Серебристо-зелёная листва древних олив шелестит под южным солнцем. Чёрный кот с янтарными глазами и его белогрудый друг устроились на причудливых корнях старого дерева.',
    palette: [
      { hex: '#606C38', name: 'Серебристая олива' },
      { hex: '#283618', name: 'Тень в ветвях' },
      { hex: '#DDA15E', name: 'Солнечная охра' },
      { hex: '#BC6C25', name: 'Ствол дерева' },
      { hex: '#161616', name: 'Угольный мех' }
    ],
    brushstrokeNote: 'Волнообразные, кручёные штрихи для узловатых стволов и мерцающие мазки листвы.',
    aspectRatio: '4:3',
    createdAt: 1789832655854,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 429
  },
  {
    id: 'vg_two_cats_rhone',
    title: 'Два чёрных кота на набережной Роны',
    titleEn: 'Two Black Cats Starry Night Over the Rhône',
    imageUrl: twoCatsRhone,
    prompt: 'A mesmerizing oil painting in the style of Vincent van Gogh Starry Night Over the Rhône 1888. Sitting closely on the wooden pier gazing out across the shimmering dark blue water are two affectionate cats: one cat is completely sleek midnight black, and the second cat is black with a neat white patch on its lower throat like a bowtie and white on its lower abdomen between its hind paws. Golden gaslight reflections dance in long trails across the dark river water, glowing celestial stars above, thick impasto oil brushstrokes.',
    style: 'Звёздная ночь над Роной',
    year: 'Арль, сентябрь 1888',
    description: 'Два неразлучных друга сидят рядышком на деревянном пирсе, любуясь тем, как золотые огни газовых фонарей Арля стекают длинными сверкающими дорожками по тёмным водам Роны.',
    palette: [
      { hex: '#03045E', name: 'Ночная Рона' },
      { hex: '#0077B6', name: 'Синий бархат воды' },
      { hex: '#FFD166', name: 'Отражение фонарей' },
      { hex: '#F4F1DE', name: 'Звёзды Большой Медведицы' },
      { hex: '#0D0D0D', name: 'Ночной силуэт' }
    ],
    brushstrokeNote: 'Вертикальные световые полосы в отражении реки и спиральные мазки вокруг ярких звёзд.',
    aspectRatio: '16:9',
    createdAt: 1789832668004,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 614
  },
  {
    id: 'vg_starry_cat',
    title: 'Звёздный Котик над Роной',
    titleEn: 'Starry Night Cat over the Rhône',
    imageUrl: vanGoghStarryCat,
    prompt: 'An oil painting of a majestic fluffy orange tabby cat in the style of Vincent van Gogh Starry Night, thick impasto visible brushstrokes, swirling blue and gold celestial sky, expressive and artistic post-impressionism',
    style: 'Звёздная ночь (Starry Night)',
    year: 'Арль, 1888 (AI Реинкарнация)',
    description: 'Величественный рыжий кот созерцает бесконечное вращение звёздных вихрей. Каждый мазок нанесён густым слоем краски (импасто), передавая эмоциональную силу ночного неба Прованса и мягкую шерсть пушистого мыслителя.',
    palette: [
      { hex: '#0047AB', name: 'Кобальт синий' },
      { hex: '#FFD700', name: 'Хром жёлтый' },
      { hex: '#120A8F', name: 'Ультрамарин' },
      { hex: '#CC7722', name: 'Охра тёплая' },
      { hex: '#E0F7FA', name: 'Звёздный белый' }
    ],
    brushstrokeNote: 'Густой рельефный импасто, спиральные динамичные линии вокруг луны и звёзд.',
    aspectRatio: '1:1',
    createdAt: 1785425794750,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 342
  },
  {
    id: 'vg_sunflower_cat',
    title: 'Котик в подсолнухах',
    titleEn: 'Kitty in Twelve Sunflowers',
    imageUrl: vanGoghSunflowerCat,
    prompt: 'A cute ginger cat peeking out from a ceramic vase of golden sunflowers in Vincent van Gogh post-impressionist oil painting style, warm yellow and ochre palette, textured brushstrokes',
    style: 'Подсолнухи (Sunflowers)',
    year: 'Жёлтый дом, Арль, 1888',
    description: 'Тепло солнца Южной Франции запечатлено в оттенках жёлтого и охры. Маленький рыжий котёнок выглядывает из знаменитой вазы с подсолнухами, символизируя благодарность и радость жизни, к которым стремился Винсент.',
    palette: [
      { hex: '#EAA221', name: 'Золотой жёлтый' },
      { hex: '#D4AF37', name: 'Хромовая охра' },
      { hex: '#8B5A2B', name: 'Сиена жжёная' },
      { hex: '#556B2F', name: 'Оливковый зелёный' },
      { hex: '#FFF8DC', name: 'Тёплый холст' }
    ],
    brushstrokeNote: 'Пастозные скульптурные штрихи для лепестков и мягкая текстура для кошачьей мордочки.',
    aspectRatio: '4:3',
    createdAt: 1785425809103,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 289
  },
  {
    id: 'vg_cafe_cat',
    title: 'Котик на террасе ночного кафе',
    titleEn: 'Tuxedo Cat at Café Terrace at Night',
    imageUrl: vanGoghCafeCat,
    prompt: 'A charming black and white tuxedo cat sitting at a candlelit table outside the Cafe Terrace at Night in Arles, Vincent van Gogh oil painting style, glowing warm yellow lights against deep cobalt blue starry sky',
    style: 'Ночное кафе (Café Terrace at Night)',
    year: 'Площадь Форума, Арль, 1888',
    description: 'Контраст синего французского вечера и тёплого света газовых фонарей. Элегантный чёрно-белый кот сидит за столиком кафе, наблюдая за ночной жизнью города под звёздами.',
    palette: [
      { hex: '#FFC107', name: 'Свет фонарей' },
      { hex: '#0A192F', name: 'Ночной кобальт' },
      { hex: '#1E3A8A', name: 'Сапфировое небо' },
      { hex: '#F59E0B', name: 'Тёплая терраса' },
      { hex: '#D1D5DB', name: 'Белый смокинг' }
    ],
    brushstrokeNote: 'Ритмичные мазки мостовой и контрастное сопоставление дополнительных цветов (жёлтый/синий).',
    aspectRatio: '16:9',
    createdAt: 1785425822088,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 415
  },
  {
    id: 'vg_almond_cat',
    title: 'Белый котик на ветви цветущего миндаля',
    titleEn: 'White Cat Resting on Blooming Almond Branches',
    imageUrl: vanGoghAlmondCat,
    prompt: 'A beautiful calm white fluffy cat resting on a blossoming almond tree branch, in the post-impressionist painting style of Vincent van Gogh Almond Blossoms 1890, turquoise blue sky background, delicate white flowers with red and yellow centers, dark expressive branches with thick oil impasto paint textures, museum masterpiece oil painting',
    style: 'Цветущий миндаль (Almond Blossom)',
    year: 'Сен-Реми, 1890',
    description: 'Символ новой жизни и надежды, написанный в честь рождения племянника Винсента. Спокойный белый кот дремлет на изогнутой ветви среди нежных белых лепестков на фоне глубокого бирюзового неба Сен-Реми.',
    palette: [
      { hex: '#2A9D8F', name: 'Бирюзовый Сен-Реми' },
      { hex: '#E76F51', name: 'Охра ствола' },
      { hex: '#F8F9FA', name: 'Лепесток миндаля' },
      { hex: '#264653', name: 'Тёмная кора' },
      { hex: '#E9C46A', name: 'Золотая пыльца' }
    ],
    brushstrokeNote: 'Японское влияние гравюр укиё-э, чёткие силуэтные ветви и фактурные пастозные лепестки.',
    aspectRatio: '4:3',
    createdAt: 1789317351101,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 312
  },
  {
    id: 'vg_bedroom_cat',
    title: 'Котик на жёлтом кресле в спальне Арля',
    titleEn: 'Cat Curled on Yellow Chair in Bedroom in Arles',
    imageUrl: vanGoghBedroomCat,
    prompt: 'A cute calico cat sleeping peacefully curled up on the yellow wooden chair in Vincent van Gogh Bedroom in Arles painting, warm pastel lilac walls, scarlet bedcover, rustic floorboards, post-impressionist oil painting with thick expressive brushstrokes',
    style: 'Спальня в Арле (Bedroom in Arles)',
    year: 'Жёлтый дом, Арль, 1888',
    description: 'Уют и безмятежный покой личной обители Винсента. Трёхцветная кошка свернулась клубочком на легендарном жёлтом стуле из плетёной соломы, окружённая лиловыми стенами и алым одеялом.',
    palette: [
      { hex: '#C8B6FF', name: 'Лиловые стены' },
      { hex: '#FFB703', name: 'Жёлтый деревянный стул' },
      { hex: '#D90429', name: 'Алое покрывало' },
      { hex: '#2A9D8F', name: 'Зелёные ставни' },
      { hex: '#BC6C25', name: 'Дубовый пол' }
    ],
    brushstrokeNote: 'Смелая упрощённая перспектива с чистыми плоскостями цвета и плотными контурными мазками.',
    aspectRatio: '4:3',
    createdAt: 1789317364061,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 278
  },
  {
    id: 'vg_wheatfield_cat',
    title: 'Рыжий котик в пшеничном поле с кипарисами',
    titleEn: 'Ginger Cat Prowling in Wheatfield with Cypresses',
    imageUrl: vanGoghWheatfieldCat,
    prompt: 'A majestic golden ginger cat walking gracefully through a swaying golden wheatfield under dynamic swirling white clouds, tall flame-like dark green cypress tree in background, Vincent van Gogh Wheatfield with Cypresses 1889 post-impressionism oil painting with thick impasto brushstrokes',
    style: 'Пшеничное поле (Wheat Field with Cypresses)',
    year: 'Сен-Реми, 1889',
    description: 'Летняя стихия Прованса: бушующие золотые волны поспевающей ржи, вздымающийся тёмно-зелёный кипарис-пламя и кружащие белые облака. Рыжий кот гордо ступает по полю, озарённый полуденным солнцем.',
    palette: [
      { hex: '#EE9B00', name: 'Золотая зрелая рожь' },
      { hex: '#132A13', name: 'Кипарисовый тёмно-зелёный' },
      { hex: '#457B9D', name: 'Бушующее небо Сен-Реми' },
      { hex: '#CA6702', name: 'Тёплая терракота' },
      { hex: '#F1FAEE', name: 'Ветреные облака' }
    ],
    brushstrokeNote: 'Вихревые, волнообразные мазки мастихином, передающие яростное колыхание трав под мистралем.',
    aspectRatio: '16:9',
    createdAt: 1789317378784,
    isUserCreated: false,
    modelUsed: 'gemini-3.1-flash-lite-image',
    likes: 389
  }
];

export const VAN_GOGH_QUOTES = [
  "«Я мечтаю о своей живописи, и потом я рисую свою мечту... а иногда и котика.»",
  "«Что было бы с нашей жизнью, если бы у нас не было мужества попытаться нарисовать кота?»",
  "«В синем и жёлтом есть какая-то особая магия, особенно когда они освещают пушистые ушки.»",
  "«Живопись — это вера, и каждый мазок должен дышать жизнью.»",
  "«Нормальность — это асфальтированная дорога: по ней удобно идти, но цветы на ней не растут.»"
];
