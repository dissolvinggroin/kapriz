const crypto = require('crypto');

// Простая CSRF-защита (synchronizer token).
// Токен живёт в сессии, прокидывается в res.locals.csrfToken и проверяется
// на всех изменяющих методах. Для AJAX токен можно слать заголовком X-CSRF-Token.
function csrf(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(16).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  const mutating = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE';
  if (mutating) {
    const sent = (req.body && req.body._csrf) || req.get('X-CSRF-Token');
    if (!sent || sent !== req.session.csrfToken) {
      return res.status(403).render('errors/403', { title: 'Сессия устарела' });
    }
  }
  next();
}

module.exports = csrf;
