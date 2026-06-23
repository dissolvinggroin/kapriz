// Корзина хранится в сессии (req.session.cart) как массив позиций:
// { productId, size, color, qty }. Без оплаты — это «черновик заказа».
const productModel = require('./productModel');
const { splitCsv } = require('../utils/format');

function getRaw(session) {
  if (!session.cart) session.cart = [];
  return session.cart;
}

function keyMatch(item, productId, size, color) {
  return item.productId === productId && item.size === (size || '') && item.color === (color || '');
}

function add(session, productId, { size, color, qty = 1 } = {}) {
  const cart = getRaw(session);
  const pid = Number(productId);
  const existing = cart.find((i) => keyMatch(i, pid, size, color));
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId: pid, size: size || '', color: color || '', qty });
  }
}

function setQty(session, index, qty) {
  const cart = getRaw(session);
  if (cart[index]) {
    cart[index].qty = Math.max(1, Number(qty) || 1);
  }
}

function removeAt(session, index) {
  const cart = getRaw(session);
  if (index >= 0 && index < cart.length) cart.splice(index, 1);
}

function clear(session) {
  session.cart = [];
}

// Разворачиваем позиции в полные данные товара с ценой
function detailed(session) {
  const cart = getRaw(session);
  const items = [];
  let total = 0;
  let count = 0;

  cart.forEach((line, index) => {
    const product = productModel.getProductById(line.productId);
    if (!product) return;
    const unit = product.sale_price && product.sale_price < product.price ? product.sale_price : product.price;
    const lineTotal = unit * line.qty;
    total += lineTotal;
    count += line.qty;
    items.push({
      index,
      product,
      size: line.size,
      color: line.color,
      qty: line.qty,
      unit,
      lineTotal,
      availableSizes: splitCsv(product.sizes),
    });
  });

  return { items, total, count };
}

function count(session) {
  return getRaw(session).reduce((sum, i) => sum + i.qty, 0);
}

module.exports = { add, setQty, removeAt, clear, detailed, count };
