const db = require('../db/database');

function add(userId, productId) {
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(
    userId,
    productId
  );
}

function remove(userId, productId) {
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(userId, productId);
}

function toggle(userId, productId) {
  if (has(userId, productId)) {
    remove(userId, productId);
    return false;
  }
  add(userId, productId);
  return true;
}

function has(userId, productId) {
  if (!userId) return false;
  return !!db
    .prepare('SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?')
    .get(userId, productId);
}

function getIds(userId) {
  if (!userId) return new Set();
  const rows = db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(userId);
  return new Set(rows.map((r) => r.product_id));
}

function getProducts(userId) {
  return db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`
    )
    .all(userId);
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM wishlist').get().c;
}

function countByUser(userId) {
  if (!userId) return 0;
  return db.prepare('SELECT COUNT(*) AS c FROM wishlist WHERE user_id = ?').get(userId).c;
}

function topProducts(limit = 5) {
  return db
    .prepare(
      `SELECT p.name, p.price, COUNT(w.user_id) AS cnt
       FROM wishlist w JOIN products p ON p.id = w.product_id
       GROUP BY p.id ORDER BY cnt DESC LIMIT ?`
    )
    .all(limit);
}

module.exports = { add, remove, toggle, has, getIds, getProducts, count, countByUser, topProducts };
