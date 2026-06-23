const express = require('express');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const reviewModel = require('../models/reviewModel');
const wishlistModel = require('../models/wishlistModel');

const router = express.Router();

const PAGE_SIZE = 12;

router.get('/', (req, res) => {
  const { category, q, minPrice, maxPrice, size, color, sale, sort } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const userId = res.locals.currentUser ? res.locals.currentUser.id : null;

  const filters = {
    categorySlug: category || undefined,
    q,
    minPrice,
    maxPrice,
    size,
    color,
    onSale: sale === '1',
    sort,
  };

  const total = productModel.countFiltered(filters);
  const products = productModel.getProducts({
    ...filters,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const shown = (page - 1) * PAGE_SIZE + products.length;

  const activeCategory = category ? categoryModel.getBySlug(category) : null;

  res.render('catalog', {
    title: q ? `Поиск: ${q}` : activeCategory ? activeCategory.name : 'Каталог',
    products,
    total,
    shown,
    page,
    hasMore: shown < total,
    categories: categoryModel.getWithCounts(),
    facets: productModel.getFacets(),
    filters: { category, q, minPrice, maxPrice, size, color, sale, sort },
    activeCategory,
    wishlistIds: wishlistModel.getIds(userId),
  });
});

router.get('/:id', (req, res, next) => {
  const product = productModel.getProductById(req.params.id);
  if (!product) return next();
  renderProduct(req, res, product, null, 200);
});

router.post('/:id/reviews', (req, res, next) => {
  const product = productModel.getProductById(req.params.id);
  if (!product) return next();

  const rating = Number(req.body.rating);
  const body = (req.body.body || '').trim();
  const authorName = res.locals.currentUser
    ? res.locals.currentUser.name
    : (req.body.authorName || '').trim();

  if (!authorName || !body || !(rating >= 1 && rating <= 5)) {
    return renderProduct(req, res, product, 'Заполните имя, текст и поставьте оценку.', 400);
  }

  reviewModel.add({
    productId: product.id,
    userId: res.locals.currentUser ? res.locals.currentUser.id : null,
    authorName,
    rating,
    body,
  });
  productModel.recalcRating(product.id);
  res.redirect(`/catalog/${product.id}#reviews`);
});

// Общий рендер страницы товара (используется GET и при ошибке отзыва)
function renderProduct(req, res, product, reviewError, status) {
  const userId = res.locals.currentUser ? res.locals.currentUser.id : null;
  let images = productModel.getProductImages(product.id);
  if (!images.length) images = [{ url: product.image_url }];

  // запоминаем просмотр в сессии (до 8 последних id)
  const prev = Array.isArray(req.session.recent) ? req.session.recent : [];
  const recentlyViewed = productModel.getByIds(prev.filter((id) => id !== product.id).slice(0, 4));
  req.session.recent = [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 8);

  res.status(status).render('product', {
    title: product.name,
    product,
    images,
    related: productModel.getRelated(product, 4),
    reviews: reviewModel.getByProduct(product.id),
    reviewSummary: reviewModel.summary(product.id),
    wishlistIds: wishlistModel.getIds(userId),
    inWishlist: wishlistModel.has(userId, product.id),
    recentlyViewed,
    reviewError,
  });
}

module.exports = router;
