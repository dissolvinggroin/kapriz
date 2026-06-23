const db = require('../db/database');
const { slugify } = require('../utils/format');

function getAll() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
}

function getWithCounts() {
  return db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`
    )
    .all();
}

function getById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function getBySlug(slug) {
  return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

function create({ name, description, imageUrl }) {
  const res = db
    .prepare('INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)')
    .run(name, slugify(name), description || null, imageUrl || null);
  return getById(res.lastInsertRowid);
}

function update(id, { name, description, imageUrl }) {
  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ? WHERE id = ?').run(
    name,
    slugify(name),
    description || null,
    imageUrl || null,
    id
  );
  return getById(id);
}

function remove(id) {
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

function countProducts(id) {
  return db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(id).c;
}

module.exports = {
  getAll,
  getWithCounts,
  getById,
  getBySlug,
  create,
  update,
  remove,
  countProducts,
};
