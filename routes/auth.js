const express = require('express');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Разрешаем только локальные относительные пути (защита от open redirect).
// Отвергаем `//host`, `/\host` и любые таргеты с обратным слэшем.
function safeRedirect(target, fallback = '/account') {
  if (typeof target === 'string' && /^\/(?![/\\])/.test(target) && !target.includes('\\')) {
    return target;
  }
  return fallback;
}

function normEmail(email) {
  return (email || '').trim().toLowerCase();
}

router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Регистрация', error: null, values: {} });
});

router.post('/register', authLimiter, (req, res) => {
  const name = (req.body.name || '').trim();
  const email = normEmail(req.body.email);
  const { password, passwordConfirm } = req.body;
  const fail = (error) =>
    res.status(400).render('auth/register', { title: 'Регистрация', error, values: { name, email } });

  if (!name || !email || !password) return fail('Заполните все поля.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Введите корректный email.');
  if (password.length < 6) return fail('Пароль должен быть не короче 6 символов.');
  if (password !== passwordConfirm) return fail('Пароли не совпадают.');
  if (userModel.findByEmail(email)) return fail('Пользователь с таким email уже существует.');

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = userModel.create({ email, passwordHash, name });
  req.session.userId = user.id;
  res.redirect('/account');
});

router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Вход',
    error: null,
    values: {},
    redirect: safeRedirect(req.query.redirect, ''),
  });
});

router.post('/login', authLimiter, (req, res) => {
  const email = normEmail(req.body.email);
  const { password } = req.body;
  const redirectTo = safeRedirect(req.body.redirect);
  const user = userModel.findByEmail(email);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(400).render('auth/login', {
      title: 'Вход',
      error: 'Неверный email или пароль.',
      values: { email },
      redirect: redirectTo,
    });
  }

  req.session.userId = user.id;
  res.redirect(redirectTo);
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
