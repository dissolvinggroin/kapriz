const db = require('../db/database');

function create({ email, passwordHash, name, role = 'user' }) {
  const res = db
    .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email, passwordHash, name, role);
  return findById(res.lastInsertRowid);
}

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getAll() {
  return db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
    .all();
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

function updateProfile(id, { name, email }) {
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
  return findById(id);
}

function updatePassword(id, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

module.exports = { create, findByEmail, findById, getAll, count, updateProfile, updatePassword };
