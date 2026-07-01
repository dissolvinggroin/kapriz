const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const wishlistModel = require('../models/wishlistModel');
const userModel = require('../models/userModel');
const orderModel = require('../models/orderModel');

const router = express.Router();

router.use(requireAuth);

function renderAccount(res, tab, extra = {}) {
  const userId = res.locals.currentUser.id;
  res.render('account/account', {
    title: tab === 'wishlist' ? 'Избранное' : tab === 'settings' ? 'Настройки' : 'Личный кабинет',
    tab,
    wishlist: wishlistModel.getProducts(userId),
    wishlistIds: wishlistModel.getIds(userId),
    orders: orderModel.getByUser(userId),
    orderStatusLabel: orderModel.statusLabel,
    notice: null,
    error: null,
    ...extra,
  });
}

router.get('/', (req, res) => renderAccount(res, 'profile'));
router.get('/wishlist', (req, res) => renderAccount(res, 'wishlist'));
router.get('/settings', (req, res) => renderAccount(res, 'settings'));

// Детали заказа (только свои)
router.get('/orders/:id', (req, res, next) => {
  const order = orderModel.getById(req.params.id);
  if (!order || order.user_id !== res.locals.currentUser.id) return next();
  res.render('account/order', {
    title: 'Заказ ' + order.number,
    order,
    items: orderModel.getItems(order.id),
    statusLabel: orderModel.statusLabel,
    statuses: orderModel.STATUSES,
  });
});

// Обновление профиля (имя, email)
router.post('/profile', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const userId = res.locals.currentUser.id;

  if (!name || !email) return renderAccount(res, 'settings', { error: 'Имя и email обязательны.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return renderAccount(res, 'settings', { error: 'Некорректный email.' });
  const existing = userModel.findByEmail(email);
  if (existing && existing.id !== userId) {
    return renderAccount(res, 'settings', { error: 'Этот email уже занят.' });
  }
  userModel.updateProfile(userId, { name, email });
  res.locals.currentUser = userModel.findById(userId);
  renderAccount(res, 'settings', { notice: 'Профиль обновлён.' });
});

// Смена пароля
router.post('/password', (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = userModel.findById(res.locals.currentUser.id);

  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return renderAccount(res, 'settings', { error: 'Текущий пароль неверный.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return renderAccount(res, 'settings', { error: 'Новый пароль должен быть не короче 6 символов.' });
  }
  if (newPassword !== confirmPassword) {
    return renderAccount(res, 'settings', { error: 'Пароли не совпадают.' });
  }
  userModel.updatePassword(user.id, bcrypt.hashSync(newPassword, 10));
  renderAccount(res, 'settings', { notice: 'Пароль изменён.' });
});

module.exports = router;
