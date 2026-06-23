// Не даём процессу падать от необработанных ошибок — логируем и продолжаем.
// (на хостинге это и предотвращает краш-луп, и показывает причину в логах)
process.on('uncaughtException', (err) => {
  console.error('!!! uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('!!! unhandledRejection:', reason && reason.stack ? reason.stack : reason);
});

const app = require('./app');
const { seedIfEmpty } = require('./seed/seed');

// На чистом хостинге (пустая БД) автоматически наполняем каталог
try {
  seedIfEmpty();
} catch (err) {
  console.error('Ошибка авто-сида:', err && err.stack ? err.stack : err);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kapriz store running on port ${PORT}`);
});
