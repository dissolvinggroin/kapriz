// Общие хелперы, используются и в seed-скрипте, и в шаблонах (через res.locals).

const COLOR_HEX = {
  'Чёрный': '#1a1a1a',
  'Белый': '#ffffff',
  'Молочный': '#f4efe6',
  'Кремовый': '#f3ead8',
  'Бежевый': '#d9c7a8',
  'Песочный': '#e3d2ad',
  'Пудровый': '#e9cfc9',
  'Бордовый': '#6e1423',
  'Изумрудный': '#0f6b53',
  'Бутылочный': '#13402d',
  'Оливковый': '#6b7042',
  'Хаки': '#7a7253',
  'Серый': '#9a9a9a',
  'Графитовый': '#3a3d42',
  'Синий': '#274690',
  'Тёмно-синий': '#1c2a4a',
  'Голубой': '#9fc1e8',
  'Красный': '#c4302b',
  'Терракотовый': '#b5613f',
  'Какао': '#5a3b2e',
  'Мокко': '#6f5043',
  'Коричневый': '#5a3b22',
  'Коньячный': '#9a5b2c',
  'Шампань': '#e7d4a6',
  'Серебристый': '#c5c9cc',
  'Золотой': '#c9a227',
  'Лавандовый': '#b9acd6',
  'Горчичный': '#c8a02a',
  'Кэмел': '#c19a6b',
  'Розовый': '#e6b7c1',
  'Черепаховый': '#8a5a2b',
};

function colorHex(name) {
  return COLOR_HEX[name && name.trim()] || '#cccccc';
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' ₽';
}

function splitCsv(str) {
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function discountPercent(price, salePrice) {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round((1 - salePrice / price) * 100);
}

let slugCounter = 0;
function slugify(str) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  let result = str
    .toLowerCase()
    .split('')
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!result) {
    slugCounter += 1;
    result = 'item-' + slugCounter;
  }
  return result;
}

// Локальные фото каталога: /public/images/catalog/p1.jpg ... pN.jpg
const IMAGE_POOL = 28;

function localImage(i) {
  const idx = ((Math.abs(Math.trunc(i)) % IMAGE_POOL) + IMAGE_POOL) % IMAGE_POOL;
  return `/images/catalog/p${idx + 1}.jpg`;
}

// Фолбэк для img onerror. Если передан seed — берём другое реальное фото из пула,
// иначе нейтральный placeholder.
function imageFallback(seed) {
  if (seed === undefined || seed === null || Number.isNaN(Number(seed))) {
    return '/images/catalog/placeholder.jpg';
  }
  return localImage(Number(seed) + 3);
}

function formatDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

// Описание наличия: { code, label } — для бейджей и логики
function stockInfo(stock) {
  const n = Number(stock) || 0;
  if (n <= 0) return { code: 'out', label: 'Нет в наличии', available: false };
  if (n <= 5) return { code: 'low', label: `Осталось ${n} шт.`, available: true };
  return { code: 'in', label: 'В наличии', available: true };
}

module.exports = {
  COLOR_HEX,
  colorHex,
  formatPrice,
  splitCsv,
  discountPercent,
  slugify,
  localImage,
  imageFallback,
  formatDate,
  stockInfo,
  IMAGE_POOL,
};
