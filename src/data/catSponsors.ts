import { Artwork } from '../types';

export interface SponsorCard {
  id: string;
  brandName: string;
  slogan: string;
  flavor: string;
  styleName: string;
  imageUrl: string;
  prompt: string;
  description: string;
  catQuote: string;
  offerBadge: string;
  targetUrl: string;
  palette: { hex: string; name: string }[];
}

// 4 Custom High-Art Gourmet Cat Food Ads designed in the styles of Van Gogh, Klimt, Monet, and Dutch Masters
export const GOURMET_CAT_SPONSORS: SponsorCard[] = [
  {
    id: 'sponsor_arles_salmon',
    brandName: 'Royal Arles Impasto Cuisine',
    slogan: 'Дикий арльский лосось в золотистом масле импасто',
    flavor: 'Филе лосося с прованскими травами',
    styleName: 'Ван Гог (Арльский период)',
    imageUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1000&q=80',
    prompt: 'A vintage van gogh oil painting advertisement poster for luxury cat food royal arles salmon with two black cats purring happily',
    description: 'Изысканный рацион для истинных четвероногих эстетов. Натуральное филе атлантического лосося с капелькой оливкового масла из садов Сен-Реми.',
    catQuote: '«Мурр... достойная награда после созерцания Звёздной ночи» — Смоки и Уголёк',
    offerBadge: '–20% для ценителей живописи',
    targetUrl: '#pro-version',
    palette: [
      { hex: '#D4AF37', name: 'Золотая охра' },
      { hex: '#0B2545', name: 'Арльский ультрамарин' },
      { hex: '#E76F51', name: 'Лососевый кадмий' },
      { hex: '#2A9D8F', name: 'Морской изумруд' }
    ]
  },
  {
    id: 'sponsor_klimt_caviar',
    brandName: 'Gilded Whisker Imperial Paté',
    slogan: 'Паштет из белой рыбы под сусальным золотом',
    flavor: 'Мраморная форель и осетровая икра',
    styleName: 'Густав Климт (Золотой модерн)',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Klimt art nouveau style gourmet luxury cat feast with golden patterns',
    description: 'Венский деликатес для котов-аристократов. Нежнейшая текстура крем-суфле, обогащенная омега-3 для сияния бархатной шерсти.',
    catQuote: '«Блеск шерсти такой, будто её озолотил сам маэстро»',
    offerBadge: 'Премиум дегустация',
    targetUrl: '#pro-version',
    palette: [
      { hex: '#FFD700', name: 'Сусальное золото' },
      { hex: '#1C1917', name: 'Бархатный оникс' },
      { hex: '#B45309', name: 'Венский янтарь' },
      { hex: '#FDE68A', name: 'Крем-суфле' }
    ]
  },
  {
    id: 'sponsor_monet_tuna',
    brandName: 'Giverny Water-Garden Gourmet',
    slogan: 'Свежайший средиземноморский тунец в нежном желе',
    flavor: 'Средиземноморский тунец и креветки',
    styleName: 'Клод Моне (Импрессионизм Живерни)',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Claude Monet impressionism soft morning pond style cat feast tuna gourmet',
    description: 'Легкий и освежающий рацион, созданный под шелест кувшинок пруда в Живерни. 100% натуральные цельные волокна тунца.',
    catQuote: '«Пробуждает аппетит так же ярко, как утреннее солнце над прудом»',
    offerBadge: 'Эко-сертификат Франции',
    targetUrl: '#pro-version',
    palette: [
      { hex: '#7EA172', name: 'Зелень кувшинки' },
      { hex: '#4A6984', name: 'Утренняя вода' },
      { hex: '#F4ACB7', name: 'Нежная роза' },
      { hex: '#F7F9FB', name: 'Шёлковая пена' }
    ]
  },
  {
    id: 'sponsor_vermeer_milk',
    brandName: 'Delft Master Cream & Poultry',
    slogan: 'Отборное фермерское птичье филе со сливками Делфта',
    flavor: 'Фермерская утка и козье молочко',
    styleName: 'Ян Вермеер (Голландский натюрморт)',
    imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1000&q=80',
    prompt: 'Vermeer dutch master lighting delicious ceramic bowl cat milk and gourmet poultry feast',
    description: 'Классический голландский натюрморт в вашей миске. Идеальный баланс белка для энергичных ночных приключений.',
    catQuote: '«Усы сыты, душа поёт голландские романсы»',
    offerBadge: 'Фермерский натюрморт',
    targetUrl: '#pro-version',
    palette: [
      { hex: '#002855', name: 'Делфтский ультрамарин' },
      { hex: '#E0A96D', name: 'Золотой холст' },
      { hex: '#FFFDF0', name: 'Парные сливки' },
      { hex: '#2B2D42', name: 'Ночная тень' }
    ]
  }
];
