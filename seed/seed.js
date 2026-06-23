require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db/database');
const { CATEGORIES, PRODUCTS, REVIEW_SNIPPETS } = require('./catalogData');
const { slugify, localImage, IMAGE_POOL } = require('../utils/format');

function clear() {
  db.prepare('DELETE FROM wishlist').run();
  db.prepare('DELETE FROM reviews').run();
  db.prepare('DELETE FROM product_images').run();
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM categories').run();
  // пользователей не трогаем, кроме пересоздания админа ниже
}

function seedCategories() {
  const insert = db.prepare(
    'INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const slugToId = {};
  CATEGORIES.forEach((cat, i) => {
    // обложка категории — фото её первого товара
    const cover = `/images/catalog/${cat.slug}-0-0.jpg`;
    const res = insert.run(cat.name, cat.slug, cat.description, cover, i);
    slugToId[cat.slug] = res.lastInsertRowid;
  });
  return slugToId;
}

function seedProductsAndReviews(slugToId) {
  const insertProduct = db.prepare(
    `INSERT INTO products
      (name, slug, category_id, price, sale_price, description, details, sizes, colors, is_new, is_bestseller, rating, stock, image_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
  );
  const insertImage = db.prepare(
    'INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)'
  );
  const insertReview = db.prepare(
    `INSERT INTO reviews (product_id, user_id, author_name, rating, body, created_at)
     VALUES (?, NULL, ?, ?, ?, datetime('now', ?))`
  );

  let globalIndex = 0;
  let productCount = 0;
  let reviewCount = 0;

  const run = db.transaction(() => {
    for (const [slug, items] of Object.entries(PRODUCTS)) {
      const categoryId = slugToId[slug];
      items.forEach((item, idx) => {
        globalIndex += 1;
        const [name, price, kw, sizes, colors, description, details] = item;

        // Скидки и новинки — умеренно, без перегруза «акциями»
        const onSale = globalIndex % 6 === 0;         // примерно каждый шестой
        const salePrice = onSale ? Math.round((price * 0.8) / 10) * 10 : null;
        const isNew = idx === 0 ? 1 : 0;              // только первая позиция в категории
        const isBestseller = 0;                        // метку «хит» не используем

        // Остатки: большинство в наличии, часть «мало», пара позиций распродана
        let stock;
        if (globalIndex % 13 === 0) stock = 0;        // нет в наличии
        else if (globalIndex % 7 === 0) stock = 1 + (globalIndex % 4); // мало (1-4)
        else stock = 8 + (globalIndex % 35);          // в наличии

        // тематические фото под товар (скачаны seed/fetchImages.js)
        const mainImage = `/images/catalog/${slug}-${idx}-0.jpg`;
        const daysAgo = `-${globalIndex} days`;

        // рейтинг считаем по отзывам ниже, пока 0
        const res = insertProduct.run(
          name,
          slugify(name),
          categoryId,
          price,
          salePrice,
          description,
          details,
          sizes,
          colors,
          isNew,
          isBestseller,
          0,
          stock,
          mainImage,
          daysAgo
        );
        const productId = res.lastInsertRowid;
        productCount += 1;

        // Галерея: тематические ракурсы того же товара
        for (let n = 0; n < 3; n += 1) {
          insertImage.run(productId, `/images/catalog/${slug}-${idx}-${n}.jpg`, n);
        }

        // Отзывы: 2-5 штук
        const reviewN = 2 + (globalIndex % 4);
        let sum = 0;
        for (let i = 0; i < reviewN; i += 1) {
          const [author, rating, body] = REVIEW_SNIPPETS[(globalIndex + i) % REVIEW_SNIPPETS.length];
          insertReview.run(productId, author, rating, body, `-${i + 1} days`);
          sum += rating;
          reviewCount += 1;
        }
        const avg = Math.round((sum / reviewN) * 10) / 10;
        db.prepare('UPDATE products SET rating = ? WHERE id = ?').run(avg, productId);
      });
    }
  });

  run();
  return { productCount, reviewCount };
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@kapriz.shop';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(password, 10);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, name = ? WHERE id = ?').run(
      passwordHash,
      'admin',
      'Администратор',
      existing.id
    );
  } else {
    db.prepare(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, 'Администратор', 'admin');
  }
  return { email, password };
}

function runSeed() {
  clear();
  const slugToId = seedCategories();
  const { productCount, reviewCount } = seedProductsAndReviews(slugToId);
  const admin = seedAdmin();

  console.log(`✓ Категорий: ${CATEGORIES.length}`);
  console.log(`✓ Товаров: ${productCount}`);
  console.log(`✓ Отзывов: ${reviewCount}`);
  console.log(`✓ Админ: ${admin.email} / ${admin.password}`);
  return { categories: CATEGORIES.length, products: productCount, reviews: reviewCount };
}

// Заполняет БД, только если товаров ещё нет (для авто-сида на чистом хостинге)
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (count === 0) {
    console.log('БД пустая — выполняю первичное наполнение…');
    runSeed();
  }
}

module.exports = { runSeed, seedIfEmpty };

// Прямой запуск (npm run seed) — всегда пересоздаёт каталог
if (require.main === module) {
  runSeed();
}
