const express = require('express');
const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');

const router = express.Router();

function wantsJson(req) {
  return (
    req.get('X-Requested-With') === 'XMLHttpRequest' ||
    (req.headers.accept || '').includes('application/json')
  );
}

// Добавить в корзину
router.post('/add', (req, res) => {
  const { productId, size, color } = req.body;
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const product = productModel.getProductById(productId);

  if (!product || product.stock <= 0) {
    if (wantsJson(req)) return res.status(400).json({ error: 'unavailable' });
    return res.redirect('/catalog');
  }

  cartModel.add(req.session, productId, { size, color, qty });
  const data = cartModel.detailed(req.session);

  if (wantsJson(req)) {
    return res.json({ ok: true, count: data.count, total: data.total });
  }
  res.redirect('/cart');
});

router.post('/update', (req, res) => {
  cartModel.setQty(req.session, Number(req.body.index), Number(req.body.qty));
  res.redirect('/cart');
});

router.post('/remove', (req, res) => {
  cartModel.removeAt(req.session, Number(req.body.index));
  if (wantsJson(req)) {
    const data = cartModel.detailed(req.session);
    return res.json({ ok: true, count: data.count, total: data.total });
  }
  res.redirect('/cart');
});

router.get('/', (req, res) => {
  res.render('cart', { title: 'Корзина', cart: cartModel.detailed(req.session) });
});

// Оформление заказа
router.post('/checkout', (req, res) => {
  const data = cartModel.detailed(req.session);
  if (!data.items.length) return res.redirect('/cart');
  const orderNumber = 'KP-' + Date.now().toString().slice(-6);
  cartModel.clear(req.session);
  res.render('cart-success', { title: 'Заказ оформлен', orderNumber });
});

// HTML выезжающей панели — подгружается AJAX-ом, без основного лейаута
router.get('/drawer', (req, res) => {
  res.render('partials/cart-drawer', { layout: false, cart: cartModel.detailed(req.session) });
});

module.exports = router;
