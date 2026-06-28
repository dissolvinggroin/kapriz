const db = require('../db/database');

function getByProduct(productId) {
  return db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC')
    .all(productId);
}

function add({ productId, userId, authorName, rating, body }) {
  db.prepare(
    'INSERT INTO reviews (product_id, user_id, author_name, rating, body) VALUES (?, ?, ?, ?, ?)'
  ).run(productId, userId || null, authorName, rating, body);
}

function getRecent(limit = 8) {
  return db
    .prepare(
      `SELECT r.*, p.name AS product_name
       FROM reviews r JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(limit);
}

function remove(id) {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
}

function getById(id) {
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM reviews').get().c;
}

function summary(productId, prefetched) {
  const rows = prefetched || getByProduct(productId);
  const total = rows.length;
  const avg = total ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rows.filter((r) => r.rating === star).length,
  }));
  return { total, avg: Math.round(avg * 10) / 10, distribution };
}

module.exports = { getByProduct, add, getRecent, remove, getById, count, summary };
