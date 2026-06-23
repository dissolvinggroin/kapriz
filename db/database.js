const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Путь к данным: по умолчанию db/data, но можно вынести на постоянный диск
// через переменную окружения DATA_DIR (например, Render persistent disk).
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'shop.sqlite'));
// WAL ускоряет локально, но на контейнерных ФС (Render и т.п.) бывает источником
// ошибок ввода-вывода. Включаем WAL только если это явно разрешено.
if (process.env.SQLITE_WAL === '1') {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
