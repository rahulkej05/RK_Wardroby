import woolCoatImg from '../assets/images/fashion_tailored_wool_coat_1794649837255.jpg';
import wrapSilkDressImg from '../assets/images/fashion_wrap_silk_dress_1794649838161.jpg';
import boxyCroppedJacketImg from '../assets/images/fashion_boxy_cropped_jacket_1794649838038.jpg';
import asymmetricalKnitImg from '../assets/images/fashion_asymmetrical_knit_1794649837428.jpg';
import relaxedLinenSuitImg from '../assets/images/fashion_relaxed_linen_suit_1794649837877.jpg';
import monochromeTrenchImg from '../assets/images/fashion_monochrome_trench_1794649839945.jpg';

export type BodyTypeId =
  | 'hourglass'
  | 'pear'
  | 'inverted-triangle'
  | 'rectangle'
  | 'apple';

export type HeightFrame = 'petite' | 'standard' | 'tall';

export type DesignCategory = 'All' | 'Outerwear' | 'Tailoring' | 'Dresses' | 'Knitwear';

export interface BodyTypeProfile {
  id: BodyTypeId;
  label: string;
  proportionSummary: string;
  stylingRule: string;
  recommendedCuts: string[];
}

export interface SellerProfile {
  id: string;
  name: string;
  city: string;
  specialty: string;
  shippingNote: string;
  returnPolicy: string;
}

export interface SellerListing {
  sellerId: string;
  sellerName: string;
  price: number;
  shippingDays: string;
  editionNote: string;
  inStockSizes: string[];
}

export interface DesignItem {
  id: string;
  title: string;
  category: Exclude<DesignCategory, 'All'>;
  fabric: string;
  silhouette: string;
  image: string;
  imageAlt: string;
  description: string;
  occasions: string[];
  keywords: string[];
  bestHeightFrames: HeightFrame[];
  bodyTypeNotes: Record<BodyTypeId, { score: number; reason: string }>;
  sellerListings: SellerListing[];
}

export const BODY_TYPES: BodyTypeProfile[] = [
  {
    id: 'hourglass',
    label: 'Hourglass',
    proportionSummary: 'Balanced shoulders & hips with a naturally defined waist',
    stylingRule: 'Follow your natural waist with fluid bias cuts, wrap ties, and belted silhouettes.',
    recommendedCuts: ['Wrap waists', 'Bias-cut silk', 'Belted coats', 'High-rise tailoring'],
  },
  {
    id: 'pear',
    label: 'Pear',
    proportionSummary: 'Defined waist with narrower shoulders and fuller lower silhouette',
    stylingRule: 'Draw visual structure upward with sharp lapels, asymmetrical necklines, and A-line drape.',
    recommendedCuts: ['Structured shoulders', 'A-line skirts', 'Asymmetrical knits', 'Cropped jackets'],
  },
  {
    id: 'inverted-triangle',
    label: 'Inverted Triangle',
    proportionSummary: 'Broader shoulder line tapering smoothly toward the waist and hips',
    stylingRule: 'Soften the upper line with raglan or unstructured shoulders and add volume below with pleats.',
    recommendedCuts: ['Wide-leg trousers', 'A-line hems', 'Unstructured linen', 'V-neck wraps'],
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    proportionSummary: 'Even proportions across shoulders, waist, and hips with clean vertical lines',
    stylingRule: 'Create sculptural dimension through cropped proportions, waist belts, and textured layering.',
    recommendedCuts: ['Boxy cropped cuts', 'Belted trenches', 'Ribbed texture', 'Double-breasted coats'],
  },
  {
    id: 'apple',
    label: 'Apple',
    proportionSummary: 'Fuller midsection paired with slender shoulders, arms, and legs',
    stylingRule: 'Elongate the torso with open vertical columns, V-necklines, and single-breasted drape.',
    recommendedCuts: ['Open longline coats', 'V-neck bias drape', 'Relaxed blazers', 'Straight-leg trousers'],
  },
];

export const SELLERS: SellerProfile[] = [
  {
    id: 'myntra',
    name: 'Myntra',
    city: 'Bengaluru',
    specialty: 'Curated Indian & global contemporary tailoring and everyday essentials',
    shippingNote: 'Express 1–2 day M-Express delivery',
    returnPolicy: '14-day easy doorstep return & exchange',
  },
  {
    id: 'zara-india',
    name: 'Zara India',
    city: 'Mumbai',
    specialty: 'Architectural outerwear, sharp tailoring & monochrome eveningwear',
    shippingNote: '2–3 day pan-India dispatch',
    returnPolicy: '30-day online or in-store return',
  },
  {
    id: 'hm-india',
    name: 'H&M India',
    city: 'Delhi NCR',
    specialty: 'Minimalist capsule separates, linen suiting & knitwear',
    shippingNote: '2–4 day standard India shipping',
    returnPolicy: '30-day return policy',
  },
  {
    id: 'uniqlo-india',
    name: 'Uniqlo India',
    city: 'Gurugram',
    specialty: 'Merino knitwear, functional outerwear & clean silhouettes',
    shippingNote: '2–3 day express courier',
    returnPolicy: '30-day unworn return window',
  },
  {
    id: 'mango-india',
    name: 'Mango India',
    city: 'Mumbai',
    specialty: 'Fluid silk-blend dresses, structured blazers & occasionwear',
    shippingNote: '2–4 day tracked delivery',
    returnPolicy: '30-day complimentary return',
  },
  {
    id: 'nykaa-fashion',
    name: 'Nykaa Fashion',
    city: 'Mumbai',
    specialty: 'Boutique Indian labels, festive & elevated contemporary wear',
    shippingNote: '2–3 day pan-India delivery',
    returnPolicy: '15-day hassle-free exchange',
  },
];

export const DESIGNS: DesignItem[] = [
  {
    id: 'double-breasted-wool-set',
    title: 'Architectural Wool Overcoat & Pleated Trouser',
    category: 'Outerwear',
    fabric: '100% Virgin Melton Wool',
    silhouette: 'Strong shoulder · Wide-leg vertical column',
    image: woolCoatImg,
    imageAlt: 'Double-breasted charcoal wool overcoat paired with wide-leg pleated trousers',
    description:
      'A mid-calf double-breasted overcoat paired with deep-pleat wide trousers. Engineered to anchor winter layering with crisp shoulder geometry and uninterrupted vertical movement.',
    occasions: ['Winter', 'Evening', 'Gallery', 'Office', 'Formal', 'Commute'],
    keywords: [
      'coat',
      'overcoat',
      'wool',
      'winter',
      'trousers',
      'wide leg',
      'structured',
      'shoulders',
      'charcoal',
      'dark',
      'formal',
      'office',
      'minimalist',
      'tailored',
      'warm',
    ],
    bestHeightFrames: ['standard', 'tall'],
    bodyTypeNotes: {
      hourglass: {
        score: 91,
        reason: 'Wide-leg pleats mirror shoulder width while an open front frames your waist.',
      },
      pear: {
        score: 96,
        reason: 'Peak lapels and structured shoulders balance hip volume effortlessly.',
      },
      'inverted-triangle': {
        score: 88,
        reason: 'Full pleated trousers add grounded volume to offset a strong upper frame.',
      },
      rectangle: {
        score: 95,
        reason: 'Double-breasted button stance and crisp shoulders build architectural shape.',
      },
      apple: {
        score: 92,
        reason: 'Worn unbuttoned, the vertical wool lapels lengthen the torso cleanly.',
      },
    },
    sellerListings: [
      {
        sellerId: 'zara-india',
        sellerName: 'Zara India',
        price: 11990,
        shippingDays: '2–3 days',
        editionNote: 'Wool-blend double-breasted tailored coat',
        inStockSizes: ['XS', 'S', 'M', 'L', 'XL'],
      },
      {
        sellerId: 'mango-india',
        sellerName: 'Mango India',
        price: 13490,
        shippingDays: '2–4 days',
        editionNote: 'Structured lapel overcoat with pleated wide trouser',
        inStockSizes: ['S', 'M', 'L', 'XL'],
      },
    ],
  },
  {
    id: 'champagne-bias-wrap-dress',
    title: 'Bias-Cut Champagne Silk Wrap Midi',
    category: 'Dresses',
    fabric: 'Heavyweight Mulberry Silk Charmeuse',
    silhouette: 'V-neckline · Adjustable draped waist tie',
    image: wrapSilkDressImg,
    imageAlt: 'Bias-cut champagne ivory silk wrap midi dress with draped waist tie',
    description:
      'Cut on a true 45-degree bias for fluid movement without cling. Features an elongated wrap sash that adjusts cleanly around the natural waist for dinner, ceremonies, or warm evenings.',
    occasions: ['Evening', 'Dinner', 'Wedding', 'Date', 'Summer', 'Cocktail'],
    keywords: [
      'dress',
      'silk',
      'wrap',
      'midi',
      'evening',
      'dinner',
      'wedding',
      'date',
      'waist',
      'champagne',
      'ivory',
      'summer',
      'cocktail',
      'feminine',
      'drape',
    ],
    bestHeightFrames: ['petite', 'standard', 'tall'],
    bodyTypeNotes: {
      hourglass: {
        score: 98,
        reason: 'True bias drape skims curves cleanly while the wrap tie highlights your waist.',
      },
      pear: {
        score: 93,
        reason: 'Open V-neckline draws focus upward while the A-line silk glides past hips.',
      },
      'inverted-triangle': {
        score: 94,
        reason: 'Delicate straps and diagonal wrap lines soften shoulder breadth naturally.',
      },
      rectangle: {
        score: 90,
        reason: 'Gathered side knot creates instant waist contour and fluid hip movement.',
      },
      apple: {
        score: 92,
        reason: 'Diagonal wrap seam and open V-neck elongate the upper body without tightness.',
      },
    },
    sellerListings: [
      {
        sellerId: 'mango-india',
        sellerName: 'Mango India',
        price: 7990,
        shippingDays: '2–4 days',
        editionNote: 'Satin-finish bias wrap midi dress',
        inStockSizes: ['XS', 'S', 'M', 'L'],
      },
      {
        sellerId: 'nykaa-fashion',
        sellerName: 'Nykaa Fashion',
        price: 6850,
        shippingDays: '2–3 days',
        editionNote: 'Fluid draped silk-blend evening midi',
        inStockSizes: ['XS', 'S', 'M', 'L', 'XL'],
      },
    ],
  },
  {
    id: 'boxy-selvedge-cropped-set',
    title: 'Cropped Selvedge Jacket & High-Rise Trouser',
    category: 'Tailoring',
    fabric: '13.5oz Okayama Raw Denim & Tropical Wool',
    silhouette: 'Cropped waist · Elongated straight leg',
    image: boxyCroppedJacketImg,
    imageAlt: 'Boxy cropped raw indigo denim jacket with high-rise slate tailored trousers',
    description:
      'High-low texture pairing: a boxy cropped Japanese selvedge jacket meeting crisp high-waisted slate trousers right at the natural waistline to lengthen leg proportions.',
    occasions: ['Casual', 'Weekend', 'Studio', 'Travel', 'Daytime', 'Smart Casual'],
    keywords: [
      'denim',
      'jacket',
      'cropped',
      'casual',
      'weekend',
      'trousers',
      'high rise',
      'boxy',
      'everyday',
      'travel',
      'indigo',
      'street',
      'studio',
      'petite',
      'legs',
    ],
    bestHeightFrames: ['petite', 'standard'],
    bodyTypeNotes: {
      hourglass: {
        score: 89,
        reason: 'Cropped hem hits at the narrowest waist point above high-rise trousers.',
      },
      pear: {
        score: 94,
        reason: 'Boxy jacket adds crisp upper-body balance while straight trousers streamline hips.',
      },
      'inverted-triangle': {
        score: 84,
        reason: 'Leave jacket unbuttoned over a soft tee to keep shoulders relaxed.',
      },
      rectangle: {
        score: 97,
        reason: 'High-rise waist break and structured boxy crop create sharp two-thirds leg ratio.',
      },
      apple: {
        score: 85,
        reason: 'Open front over a crisp tucked tee keeps vertical line clean without bulk.',
      },
    },
    sellerListings: [
      {
        sellerId: 'uniqlo-india',
        sellerName: 'Uniqlo India',
        price: 4990,
        shippingDays: '2–3 days',
        editionNote: 'Raw indigo boxy jacket & smart ankle trouser',
        inStockSizes: ['XS', 'S', 'M', 'L'],
      },
      {
        sellerId: 'myntra',
        sellerName: 'Myntra',
        price: 4299,
        shippingDays: '1–2 days',
        editionNote: 'M-Express eligible tailored high-rise set',
        inStockSizes: ['S', 'M', 'L', 'XL'],
      },
    ],
  },
  {
    id: 'asymmetrical-merino-aline',
    title: 'Asymmetrical Ribbed Merino & A-Line Midi',
    category: 'Knitwear',
    fabric: 'Extra-Fine Zegna Baruffa Merino & Boiled Wool',
    silhouette: 'Diagonal knit rib · Flared A-line skirt',
    image: asymmetricalKnitImg,
    imageAlt: 'Bone-white asymmetrical ribbed merino sweater paired with dark A-line midi skirt',
    description:
      'Sculptural diagonal ribbing shapes the torso gently without clinging, paired with a fluid dark wool A-line skirt for effortless autumn-to-winter balance.',
    occasions: ['Autumn', 'Winter', 'Art', 'Weekend', 'Cafe', 'Office'],
    keywords: [
      'sweater',
      'knit',
      'knitwear',
      'skirt',
      'a-line',
      'merino',
      'wool',
      'winter',
      'autumn',
      'cozy',
      'warm',
      'white',
      'cream',
      'asymmetrical',
      'midi',
    ],
    bestHeightFrames: ['petite', 'standard', 'tall'],
    bodyTypeNotes: {
      hourglass: {
        score: 92,
        reason: 'Wide ribbed waistband anchors the knit at your natural waist above the flare.',
      },
      pear: {
        score: 98,
        reason: 'Light-toned sculptural knit draws attention up while the dark A-line skirt skims hips.',
      },
      'inverted-triangle': {
        score: 95,
        reason: 'Dropped sculptural sleeves soften shoulders while the flared skirt builds lower balance.',
      },
      rectangle: {
        score: 93,
        reason: 'Diagonal rib panels and flared midi hem add rich curvature and depth.',
      },
      apple: {
        score: 89,
        reason: 'Asymmetrical knit texture breaks up the midsection cleanly above a high waist.',
      },
    },
    sellerListings: [
      {
        sellerId: 'uniqlo-india',
        sellerName: 'Uniqlo India',
        price: 4490,
        shippingDays: '2–3 days',
        editionNote: 'Extra-fine merino ribbed knit & flared skirt',
        inStockSizes: ['XS', 'S', 'M', 'L', 'XL'],
      },
      {
        sellerId: 'hm-india',
        sellerName: 'H&M India',
        price: 3999,
        shippingDays: '2–4 days',
        editionNote: 'Soft-touch wool-blend asymmetrical knit',
        inStockSizes: ['XS', 'S', 'M', 'L'],
      },
    ],
  },
  {
    id: 'unstructured-linen-suiting',
    title: 'Unstructured Stone Linen Blazer & Pleated Pant',
    category: 'Tailoring',
    fabric: 'Belgian Flax Linen (240gsm)',
    silhouette: 'Soft unpadded shoulder · Relaxed tapered leg',
    image: relaxedLinenSuitImg,
    imageAlt: 'Warm stone-gray unstructured linen blazer and pleated trousers over white tee',
    description:
      'Breathable Belgian linen suiting stripped of stiff canvas and shoulder pads. Designed to drape effortlessly from warm-weather meetings to coastal evenings.',
    occasions: ['Summer', 'Spring', 'Work', 'Travel', 'Dinner', 'Warm Weather'],
    keywords: [
      'linen',
      'suit',
      'blazer',
      'summer',
      'spring',
      'breathable',
      'warm',
      'relaxed',
      'office',
      'work',
      'travel',
      'stone',
      'beige',
      'gray',
      'smart casual',
    ],
    bestHeightFrames: ['petite', 'standard', 'tall'],
    bodyTypeNotes: {
      hourglass: {
        score: 88,
        reason: 'Single-button soft lapel follows your torso without boxing in the waist.',
      },
      pear: {
        score: 90,
        reason: 'Single-breasted blazer hits right below the hip with relaxed pleated drape.',
      },
      'inverted-triangle': {
        score: 96,
        reason: 'Zero shoulder padding lets your upper line relax while pleats add lower balance.',
      },
      rectangle: {
        score: 92,
        reason: 'Monochrome stone column creates clean vertical polish with relaxed texture.',
      },
      apple: {
        score: 97,
        reason: 'Unstructured open lapel creates a slimming vertical channel over a crisp tee.',
      },
    },
    sellerListings: [
      {
        sellerId: 'hm-india',
        sellerName: 'H&M India',
        price: 5499,
        shippingDays: '2–4 days',
        editionNote: 'Breathable linen-blend relaxed blazer & pant',
        inStockSizes: ['XS', 'S', 'M', 'L', 'XL'],
      },
      {
        sellerId: 'myntra',
        sellerName: 'Myntra',
        price: 4799,
        shippingDays: '1–2 days',
        editionNote: 'Pure European flax lightweight summer suit',
        inStockSizes: ['S', 'M', 'L'],
      },
    ],
  },
  {
    id: 'belted-gabardine-trench',
    title: 'Belted Matte Technical Gabardine Trench',
    category: 'Outerwear',
    fabric: 'Water-Repellent Cotton-Nylon Gabardine',
    silhouette: 'Storm flap drape · Cinched self-belt',
    image: monochromeTrenchImg,
    imageAlt: 'Belted matte-black technical gabardine trench coat with storm flap',
    description:
      'A weatherproof matte-black trench coat cut with an asymmetrical storm flap and wide self-tie belt. Moves seamlessly from rainy city commutes to late-night dinners.',
    occasions: ['Rain', 'Travel', 'Commute', 'Autumn', 'Spring', 'Evening'],
    keywords: [
      'trench',
      'coat',
      'rain',
      'belted',
      'black',
      'monochrome',
      'commute',
      'travel',
      'spring',
      'autumn',
      'waist',
      'long',
      'weatherproof',
      'minimalist',
    ],
    bestHeightFrames: ['standard', 'tall'],
    bodyTypeNotes: {
      hourglass: {
        score: 97,
        reason: 'Wide self-belt cinches neatly at the waist while the storm flap adds movement.',
      },
      pear: {
        score: 94,
        reason: 'Asymmetrical storm flap builds upper interest above a sweeping A-line hem.',
      },
      'inverted-triangle': {
        score: 92,
        reason: 'Raglan sleeve pitch softens shoulders and flared lower skirt balances proportions.',
      },
      rectangle: {
        score: 95,
        reason: 'Belted waist and cascading storm lapel sculpt immediate hourglass definition.',
      },
      apple: {
        score: 90,
        reason: 'Tie the belt slightly higher or leave open for an uninterrupted dark column.',
      },
    },
    sellerListings: [
      {
        sellerId: 'zara-india',
        sellerName: 'Zara India',
        price: 8990,
        shippingDays: '2–3 days',
        editionNote: 'Water-repellent belted matte gabardine trench',
        inStockSizes: ['XS', 'S', 'M', 'L', 'XL'],
      },
      {
        sellerId: 'mango-india',
        sellerName: 'Mango India',
        price: 9490,
        shippingDays: '2–4 days',
        editionNote: 'Double-storm-flap longline trench coat',
        inStockSizes: ['XS', 'S', 'M', 'L'],
      },
      {
        sellerId: 'nykaa-fashion',
        sellerName: 'Nykaa Fashion',
        price: 7499,
        shippingDays: '2–3 days',
        editionNote: 'Lightweight commuter trench shell',
        inStockSizes: ['S', 'M', 'L'],
      },
    ],
  },
];
