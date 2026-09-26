export type Category = 'energy' | 'hydration' | 'merch';

export type MerchKind = 'tee' | 'hat' | 'shaker';

export type Product = {
  id: string;
  name: string;
  flavor: string;
  category: Category;
  price: number;
  tagline: string;
  description: string;
  /** Two-stop gradient used for the product art and detail backdrop */
  gradient: [string, string];
  /** Whether to draw black (true) or white (false) logo/text on the art */
  darkInk: boolean;
  stats: { label: string; value: string }[];
  ingredients?: string[];
  merchKind?: MerchKind;
  sizes?: string[];
  packs?: { label: string; count: number; multiplier: number }[];
  badge?: string;
  rating: number;
  reviews: number;
};

const shotPacks = [
  { label: '6 PACK', count: 6, multiplier: 1 },
  { label: '12 PACK', count: 12, multiplier: 1.85 },
  { label: '24 PACK', count: 24, multiplier: 3.4 },
];

const stickPacks = [
  { label: '10 CT', count: 10, multiplier: 1 },
  { label: '20 CT', count: 20, multiplier: 1.8 },
  { label: '30 CT', count: 30, multiplier: 2.5 },
];

const shotStats = [
  { label: 'CAFFEINE', value: '200MG' },
  { label: 'SUGAR', value: '0G' },
  { label: 'CALORIES', value: '10' },
];

const stickStats = [
  { label: 'ELECTROLYTES', value: '5X' },
  { label: 'SUGAR', value: '1G' },
  { label: 'VITAMIN C', value: '100%' },
];

export const products: Product[] = [
  {
    id: 'original-charge',
    name: 'Original Charge',
    flavor: 'Citrus Gold',
    category: 'energy',
    price: 17.99,
    tagline: 'The one that started the stampede.',
    description:
      'Our signature 2oz energy shot. Clean caffeine, B-vitamins and zero sugar to fuel whatever arena you step into \u2014 no jitters, no crash.',
    gradient: ['#FFE94D', '#FEDB00'],
    darkInk: true,
    stats: shotStats,
    ingredients: ['Natural Caffeine', 'Vitamin B12', 'Vitamin B6', 'L-Theanine', 'Taurine'],
    packs: shotPacks,
    badge: 'BEST SELLER',
    rating: 4.9,
    reviews: 2140,
  },
  {
    id: 'blue-raze',
    name: 'Blue Raze',
    flavor: 'Blue Raspberry',
    category: 'energy',
    price: 17.99,
    tagline: 'Ice-cold focus. Zero fade.',
    description:
      'Blue raspberry flavor with the same clean 200mg charge. Built for early lifts, late study sessions and everything in between.',
    gradient: ['#2FA4FF', '#0077C8'],
    darkInk: false,
    stats: shotStats,
    ingredients: ['Natural Caffeine', 'Vitamin B12', 'Vitamin B6', 'L-Theanine', 'Taurine'],
    packs: shotPacks,
    rating: 4.8,
    reviews: 1312,
  },
  {
    id: 'red-cape',
    name: 'Red Cape',
    flavor: 'Wild Cherry',
    category: 'energy',
    price: 17.99,
    tagline: 'Wave it. Watch them charge.',
    description:
      'Bold wild cherry flavor inspired by the matador\u2019s cape. Clean energy that hits fast and lasts for hours.',
    gradient: ['#FF5A66', '#EF3340'],
    darkInk: false,
    stats: shotStats,
    ingredients: ['Natural Caffeine', 'Vitamin B12', 'Vitamin B6', 'L-Theanine', 'Taurine'],
    packs: shotPacks,
    badge: 'NEW',
    rating: 4.8,
    reviews: 604,
  },
  {
    id: 'black-horn',
    name: 'Black Horn',
    flavor: 'Midnight Grape',
    category: 'energy',
    price: 19.99,
    tagline: 'Extra strength for the final round.',
    description:
      'Our strongest shot: 300mg of clean caffeine with a dark grape finish. For when the stakes are highest.',
    gradient: ['#3A3A3A', '#0D0D0D'],
    darkInk: false,
    stats: [
      { label: 'CAFFEINE', value: '300MG' },
      { label: 'SUGAR', value: '0G' },
      { label: 'CALORIES', value: '10' },
    ],
    ingredients: ['Natural Caffeine', 'Vitamin B12', 'Alpha-GPC', 'L-Theanine', 'Taurine'],
    packs: shotPacks,
    badge: 'EXTRA',
    rating: 4.9,
    reviews: 877,
  },
  {
    id: 'lemon-lime-hydrate',
    name: 'Lemon Lime',
    flavor: 'Hydration Stick',
    category: 'hydration',
    price: 24.99,
    tagline: 'Rehydrate like a champion.',
    description:
      'Single-serve electrolyte sticks. Tear, pour, shake \u2014 5x the electrolytes of a sports drink with only 1g of sugar.',
    gradient: ['#E4FF5C', '#9BE22D'],
    darkInk: true,
    stats: stickStats,
    ingredients: ['Sodium', 'Potassium', 'Magnesium', 'Vitamin C', 'Zinc'],
    packs: stickPacks,
    badge: 'BEST SELLER',
    rating: 4.9,
    reviews: 1588,
  },
  {
    id: 'tropical-storm',
    name: 'Tropical Storm',
    flavor: 'Hydration Stick',
    category: 'hydration',
    price: 24.99,
    tagline: 'A downpour of electrolytes.',
    description:
      'Mango-pineapple electrolyte sticks for training days, travel days and the morning after.',
    gradient: ['#FFB23F', '#FF7A00'],
    darkInk: true,
    stats: stickStats,
    ingredients: ['Sodium', 'Potassium', 'Magnesium', 'Vitamin C', 'Zinc'],
    packs: stickPacks,
    rating: 4.7,
    reviews: 932,
  },
  {
    id: 'berry-blitz',
    name: 'Berry Blitz',
    flavor: 'Hydration Stick',
    category: 'hydration',
    price: 24.99,
    tagline: 'Mixed berry. Maximum recovery.',
    description:
      'Mixed berry electrolyte sticks designed to replace what you sweat out \u2014 fast.',
    gradient: ['#C150FF', '#7B2FF7'],
    darkInk: false,
    stats: stickStats,
    ingredients: ['Sodium', 'Potassium', 'Magnesium', 'Vitamin C', 'Zinc'],
    packs: stickPacks,
    rating: 4.8,
    reviews: 741,
  },
  {
    id: 'watermelon-wave',
    name: 'Watermelon Wave',
    flavor: 'Hydration Stick',
    category: 'hydration',
    price: 24.99,
    tagline: 'Summer in a stick.',
    description:
      'Juicy watermelon electrolyte sticks. Light, crisp, and ridiculously refreshing.',
    gradient: ['#FF7C9C', '#FF3D6E'],
    darkInk: false,
    stats: stickStats,
    ingredients: ['Sodium', 'Potassium', 'Magnesium', 'Vitamin C', 'Zinc'],
    packs: stickPacks,
    badge: 'NEW',
    rating: 4.8,
    reviews: 388,
  },
  {
    id: 'horns-tee',
    name: 'Horns Tee',
    flavor: 'Heavyweight Cotton',
    category: 'merch',
    price: 34.0,
    tagline: 'Wear the horns.',
    description:
      'Oversized heavyweight tee with the Matador mark on the chest. Garment-dyed for that broken-in feel from day one.',
    gradient: ['#2A2A2A', '#0A0A0A'],
    darkInk: false,
    stats: [
      { label: 'WEIGHT', value: '280GSM' },
      { label: 'FIT', value: 'BOXY' },
      { label: 'COTTON', value: '100%' },
    ],
    merchKind: 'tee',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'DROP 01',
    rating: 4.9,
    reviews: 312,
  },
  {
    id: 'gold-horns-tee',
    name: 'Gold Horns Tee',
    flavor: 'Arena Gold',
    category: 'merch',
    price: 36.0,
    tagline: 'Step into the arena.',
    description:
      'Our PMS 108 gold colorway with a black Matador mark on the chest and slanted wordmark on the back.',
    gradient: ['#FFF4A3', '#FEDB00'],
    darkInk: true,
    stats: [
      { label: 'WEIGHT', value: '280GSM' },
      { label: 'FIT', value: 'BOXY' },
      { label: 'COTTON', value: '100%' },
    ],
    merchKind: 'tee',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'DROP 01',
    rating: 4.8,
    reviews: 144,
  },
  {
    id: 'charge-cap',
    name: 'Charge Cap',
    flavor: 'Structured Snapback',
    category: 'merch',
    price: 32.0,
    tagline: 'Horns up.',
    description: 'Structured six-panel snapback with an embroidered yellow Matador mark.',
    gradient: ['#2A2A2A', '#0A0A0A'],
    darkInk: false,
    stats: [
      { label: 'PANELS', value: '6' },
      { label: 'FIT', value: 'SNAP' },
      { label: 'MARK', value: '3D' },
    ],
    merchKind: 'hat',
    sizes: ['ONE SIZE'],
    rating: 4.7,
    reviews: 201,
  },
  {
    id: 'matador-shaker',
    name: 'Arena Shaker',
    flavor: '24oz Bottle',
    category: 'merch',
    price: 22.0,
    tagline: 'Mix your hydration anywhere.',
    description:
      'Leak-proof 24oz shaker built for Matador hydration sticks. Dishwasher safe, BPA free.',
    gradient: ['#F5F5F5', '#CFCFCF'],
    darkInk: true,
    stats: [
      { label: 'SIZE', value: '24OZ' },
      { label: 'BPA', value: 'FREE' },
      { label: 'LEAKS', value: '0' },
    ],
    merchKind: 'shaker',
    sizes: ['24 OZ'],
    rating: 4.8,
    reviews: 96,
  },
];

export const categories: { key: Category; label: string; blurb: string }[] = [
  { key: 'energy', label: 'Energy Shots', blurb: '200MG clean caffeine' },
  { key: 'hydration', label: 'Hydration', blurb: '5x electrolytes' },
  { key: 'merch', label: 'Merch', blurb: 'Wear the horns' },
];

export function getProduct(id: string | undefined) {
  return products.find((p) => p.id === id);
}

export function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}
