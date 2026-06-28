function isAjax(req) {
  return (
    req.get('X-Requested-With') === 'XMLHttpRequest' ||
    (req.headers.accept || '').includes('application/json')
  );
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (isAjax(req)) {
      return res.status(401).json({ error: 'auth_required' });
    }
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!res.locals.currentUser || res.locals.currentUser.role !== 'admin') {
    return res.status(403).render('errors/403', { title: 'Доступ запрещён' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
