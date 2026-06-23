const db = require('../db/database');

const SORT = {
  newest: 'p.created_at DESC',
  price_asc: 'COALESCE(p.sale_price, p.price) ASC',
  price_desc: 'COALESCE(p.sale_price, p.price) DESC',
  rating: 'p.rating DESC',
  popular: 'p.is_bestseller DESC, p.rating DESC',
};

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => '\\' + ch);
}

function baseSelect() {
  return `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
  `;
}

// Собираем WHERE и параметры из фильтров — общее для выборки и подсчёта
function buildWhere(filters = {}) {
  const { categorySlug, q, minPrice, maxPrice, size, color, onSale, isNew, bestseller, inStock } = filters;
  const where = [];
  const params = [];

  if (categorySlug) {
    where.push('c.slug = ?');
    params.push(categorySlug);
  }
  if (q && q.trim()) {
    where.push("(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(q.trim())}%`;
    params.push(like, like);
  }
  const min = Number(minPrice);
  if (minPrice !== undefined && minPrice !== '' && Number.isFinite(min)) {
    where.push('COALESCE(p.sale_price, p.price) >= ?');
    params.push(min);
  }
  const max = Number(maxPrice);
  if (maxPrice !== undefined && maxPrice !== '' && Number.isFinite(max)) {
    where.push('COALESCE(p.sale_price, p.price) <= ?');
    params.push(max);
  }
  if (size) {
    // нормализуем разделители: убираем пробелы и оборачиваем запятыми,
    // чтобы "M" не совпадал с "XL"/"XS"
    where.push("(',' || REPLACE(p.sizes, ' ', '') || ',') LIKE ? ESCAPE '\\'");
    params.push(`%,${escapeLike(String(size).trim())},%`);
  }
  if (color) {
    where.push("p.colors LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(color)}%`);
  }
  if (onSale) where.push('p.sale_price IS NOT NULL');
  if (isNew) where.push('p.is_new = 1');
  if (bestseller) where.push('p.is_bestseller = 1');
  if (inStock) where.push('p.stock > 0');

  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function getProducts(filters = {}) {
  const { clause, params } = buildWhere(filters);
  const orderClause = `ORDER BY ${SORT[filters.sort] || SORT.newest}`;

  let tail = '';
  const limit = Number(filters.limit);
  if (Number.isFinite(limit) && limit > 0) {
    tail += ' LIMIT ?';
    params.push(limit);
    const offset = Number(filters.offset);
    if (Number.isFinite(offset) && offset > 0) {
      tail += ' OFFSET ?';
      params.push(offset);
    }
  }

  return db.prepare(`${baseSelect()} ${clause} ${orderClause} ${tail}`).all(...params);
}

function countFiltered(filters = {}) {
  const { clause, params } = buildWhere(filters);
  return db
    .prepare(`SELECT COUNT(*) AS c FROM products p JOIN categories c ON c.id = p.category_id ${clause}`)
    .get(...params).c;
}

// Доступные значения размеров и цветов для панели фильтров (без полной выборки товаров)
function getFacets() {
  const sizeRows = db.prepare('SELECT DISTINCT sizes FROM products').all();
  const colorRows = db.prepare('SELECT DISTINCT colors FROM products').all();
  const sizes = new Set();
  const colors = new Set();
  sizeRows.forEach((r) => (r.sizes || '').split(',').forEach((s) => s.trim() && sizes.add(s.trim())));
  colorRows.forEach((r) => (r.colors || '').split(',').forEach((c) => c.trim() && colors.add(c.trim())));
  return { sizes: Array.from(sizes), colors: Array.from(colors) };
}

function getProductById(id) {
  return db.prepare(`${baseSelect()} WHERE p.id = ?`).get(id);
}

function getProductImages(productId) {
  return db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order')
    .all(productId);
}

function getRelated(product, limit = 4) {
  return db
    .prepare(`${baseSelect()} WHERE p.category_id = ? AND p.id != ? ORDER BY p.rating DESC LIMIT ?`)
    .all(product.category_id, product.id, limit);
}

function getByIds(ids) {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`${baseSelect()} WHERE p.id IN (${placeholders})`).all(...ids);
  // сохраняем порядок переданных id
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(Number(id))).filter(Boolean);
}

function setImages(productId, urls) {
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const insert = db.prepare('INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)');
  urls.filter(Boolean).forEach((url, i) => insert.run(productId, url, i));
}

function createProduct(data) {
  const res = db
    .prepare(
      `INSERT INTO products (name, slug, category_id, price, sale_price, description, details, sizes, colors, is_new, is_bestseller, stock, image_url)
       VALUES (@name, @slug, @categoryId, @price, @salePrice, @description, @details, @sizes, @colors, @isNew, @isBestseller, @stock, @imageUrl)`
    )
    .run(data);
  const productId = res.lastInsertRowid;
  if (data.gallery && data.gallery.length) {
    setImages(productId, data.gallery);
  } else if (data.imageUrl) {
    setImages(productId, [data.imageUrl]);
  }
  return getProductById(productId);
}

function updateProduct(id, data) {
  db.prepare(
    `UPDATE products SET
      name = @name, slug = @slug, category_id = @categoryId, price = @price,
      sale_price = @salePrice, description = @description, details = @details,
      sizes = @sizes, colors = @colors, is_new = @isNew, is_bestseller = @isBestseller,
      stock = @stock, image_url = @imageUrl
     WHERE id = @id`
  ).run({ ...data, id: Number(id) });
  if (data.gallery && data.gallery.length) {
    setImages(Number(id), data.gallery);
  }
  return getProductById(id);
}

function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

function countProducts() {
  return db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
}

function averageRating() {
  const row = db.prepare('SELECT AVG(rating) AS avg FROM products WHERE rating > 0').get();
  return row.avg ? Math.round(row.avg * 10) / 10 : 0;
}

function countLowStock(threshold = 5) {
  return db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock > 0 AND stock <= ?').get(threshold).c;
}

function recalcRating(productId) {
  const row = db
    .prepare('SELECT AVG(rating) AS avg FROM reviews WHERE product_id = ?')
    .get(productId);
  const avg = row.avg ? Math.round(row.avg * 10) / 10 : 0;
  db.prepare('UPDATE products SET rating = ? WHERE id = ?').run(avg, productId);
  return avg;
}

module.exports = {
  getProducts,
  countFiltered,
  getFacets,
  getProductById,
  getProductImages,
  getRelated,
  getByIds,
  setImages,
  createProduct,
  updateProduct,
  deleteProduct,
  countProducts,
  averageRating,
  countLowStock,
  recalcRating,
};
