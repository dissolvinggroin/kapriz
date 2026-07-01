const db = require('../db/database');

// Статусы заказа в порядке жизненного цикла
const STATUSES = [
  { key: 'new', label: 'Оформлен' },
  { key: 'processing', label: 'В обработке' },
  { key: 'shipped', label: 'Отправлен' },
  { key: 'delivered', label: 'Доставлен' },
  { key: 'cancelled', label: 'Отменён' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

function statusLabel(key) {
  return STATUS_MAP[key] || key;
}

// Создание заказа с позициями — в транзакции
const createOrder = db.transaction((order, items) => {
  const res = db
    .prepare(
      `INSERT INTO orders (number, user_id, status, total, delivery, customer_name, customer_email)
       VALUES (@number, @userId, @status, @total, @delivery, @customerName, @customerEmail)`
    )
    .run(order);
  const orderId = res.lastInsertRowid;
  const insItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, size, color, qty, unit_price)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((it) =>
    insItem.run(orderId, it.productId, it.productName, it.size || '', it.color || '', it.qty, it.unitPrice)
  );
  return orderId;
});

function getByUser(userId) {
  return db
    .prepare(
      `SELECT o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`
    )
    .all(userId);
}

function getAll() {
  return db
    .prepare(
      `SELECT o.*, u.name AS user_name, u.email AS user_email,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    )
    .all();
}

function getById(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function getItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
}

function updateStatus(id, status) {
  if (!STATUS_MAP[status]) return false;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  return true;
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
}

function countByStatus(status) {
  return db.prepare('SELECT COUNT(*) AS c FROM orders WHERE status = ?').get(status).c;
}

module.exports = {
  STATUSES,
  statusLabel,
  createOrder,
  getByUser,
  getAll,
  getById,
  getItems,
  updateStatus,
  count,
  countByStatus,
};
