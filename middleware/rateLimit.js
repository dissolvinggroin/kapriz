// Простой in-memory ограничитель попыток по IP (для учебного проекта достаточно;
// в проде использовать express-rate-limit + общее хранилище).
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = 'Слишком много попыток. Попробуйте позже.' } = {}) {
  const hits = new Map();

  // периодическая очистка устаревших записей
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) {
      if (now > rec.reset) hits.delete(key);
    }
  }, windowMs).unref();

  return function (req, res, next) {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || now > rec.reset) {
      rec = { count: 0, reset: now + windowMs };
      hits.set(key, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      return res.status(429).render('errors/429', { title: 'Слишком много запросов', message });
    }
    next();
  };
}

module.exports = rateLimit;
