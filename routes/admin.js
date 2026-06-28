const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');
const reviewModel = require('../models/reviewModel');
const wishlistModel = require('../models/wishlistModel');
const { slugify, splitCsv } = require('../utils/format');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.use((req, res, next) => {
  res.locals.layout = 'layouts/admin';
  next();
});

function buildProductData(body) {
  const price = Number(body.price);
  const saleRaw = body.salePrice ? Number(body.salePrice) : null;
  // нормализуем размеры/цвета: тримим вокруг запятых
  const normCsv = (v) => splitCsv(v).join(',');
  // галерея: по одному URL на строку
  const gallery = (body.gallery || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: (body.name || '').trim(),
    slug: slugify(body.name || ''),
    categoryId: Number(body.categoryId),
    price,
    salePrice: saleRaw && saleRaw > 0 && saleRaw < price ? saleRaw : null,
    description: body.description || '',
    details: body.details || '',
    sizes: normCsv(body.sizes),
    colors: normCsv(body.colors),
    isNew: body.isNew ? 1 : 0,
    isBestseller: body.isBestseller ? 1 : 0,
    stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
    imageUrl: (body.imageUrl || gallery[0] || '').trim(),
    gallery,
  };
}

// Возвращает текст ошибки или null
function validateProduct(data) {
  if (!data.name) return 'Укажите название товара.';
  if (!Number.isFinite(data.price) || data.price <= 0) return 'Цена должна быть положительным числом.';
  if (!Number.isFinite(data.categoryId) || !categoryModel.getById(data.categoryId)) {
    return 'Выберите существующую категорию.';
  }
  return null;
}

// Dashboard
router.get('/', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Дашборд',
    stats: {
      products: productModel.countProducts(),
      categories: categoryModel.getAll().length,
      users: userModel.count(),
      reviews: reviewModel.count(),
      wishlist: wishlistModel.count(),
      avgRating: productModel.averageRating(),
      lowStock: productModel.countLowStock(5),
    },
    topWishlisted: wishlistModel.topProducts(5),
    recentReviews: reviewModel.getRecent(6),
  });
});

// Products (с поиском и фильтром по категории)
router.get('/products', (req, res) => {
  const { q, category } = req.query;
  res.render('admin/products/list', {
    title: 'Товары',
    products: productModel.getProducts({ q, categorySlug: category || undefined, sort: 'newest' }),
    categories: categoryModel.getAll(),
    filters: { q: q || '', category: category || '' },
  });
});

router.get('/products/new', (req, res) => {
  res.render('admin/products/form', {
    title: 'Новый товар',
    product: null,
    images: [],
    categories: categoryModel.getAll(),
    error: null,
  });
});

router.post('/products', (req, res) => {
  const data = buildProductData(req.body);
  const error = validateProduct(data);
  if (error) {
    return res.status(400).render('admin/products/form', {
      title: 'Новый товар',
      product: req.body,
      images: [],
      categories: categoryModel.getAll(),
      error,
    });
  }
  if (!data.imageUrl) {
    data.imageUrl = `/images/catalog/placeholder.jpg`;
    data.gallery = [data.imageUrl];
  }
  productModel.createProduct(data);
  res.redirect('/admin/products');
});

router.get('/products/:id/edit', (req, res, next) => {
  const product = productModel.getProductById(req.params.id);
  if (!product) return next();
  res.render('admin/products/form', {
    title: 'Редактирование товара',
    product,
    images: productModel.getProductImages(product.id),
    categories: categoryModel.getAll(),
    error: null,
  });
});

router.post('/products/:id', (req, res, next) => {
  if (!productModel.getProductById(req.params.id)) return next();
  const data = buildProductData(req.body);
  const error = validateProduct(data);
  if (error) {
    return res.status(400).render('admin/products/form', {
      title: 'Редактирование товара',
      product: { id: req.params.id, ...req.body },
      images: productModel.getProductImages(req.params.id),
      categories: categoryModel.getAll(),
      error,
    });
  }
  productModel.updateProduct(req.params.id, data);
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', (req, res) => {
  productModel.deleteProduct(req.params.id);
  res.redirect('/admin/products');
});

// Categories
function renderCategories(res, error, status = 200) {
  return res.status(status).render('admin/categories/list', {
    title: 'Категории',
    categories: categoryModel.getWithCounts(),
    error,
  });
}

router.get('/categories', (req, res) => renderCategories(res, null));

router.post('/categories', (req, res) => {
  const { name, description, imageUrl } = req.body;
  if (!name || !name.trim()) return renderCategories(res, 'Введите название категории.', 400);
  categoryModel.create({ name: name.trim(), description, imageUrl });
  res.redirect('/admin/categories');
});

router.get('/categories/:id/edit', (req, res, next) => {
  const category = categoryModel.getById(req.params.id);
  if (!category) return next();
  res.render('admin/categories/form', { title: 'Категория', category, error: null });
});

router.post('/categories/:id', (req, res) => {
  const { name, description, imageUrl } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).render('admin/categories/form', {
      title: 'Категория',
      category: { id: req.params.id, ...req.body, image_url: req.body.imageUrl },
      error: 'Введите название категории.',
    });
  }
  categoryModel.update(req.params.id, { name: name.trim(), description, imageUrl });
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', (req, res) => {
  if (categoryModel.countProducts(req.params.id) > 0) {
    return renderCategories(res, 'Нельзя удалить категорию с товарами. Сначала удалите товары.', 400);
  }
  try {
    categoryModel.remove(req.params.id);
  } catch (e) {
    // на случай гонки: товар добавили между проверкой и удалением
    return renderCategories(res, 'Не удалось удалить: в категории есть товары.', 400);
  }
  res.redirect('/admin/categories');
});

// Reviews
router.get('/reviews', (req, res) => {
  res.render('admin/reviews/list', { title: 'Отзывы', reviews: reviewModel.getRecent(100) });
});

router.post('/reviews/:id/delete', (req, res) => {
  const review = reviewModel.getById(req.params.id);
  reviewModel.remove(req.params.id);
  if (review) productModel.recalcRating(review.product_id);
  res.redirect('/admin/reviews');
});

// Users
router.get('/users', (req, res) => {
  res.render('admin/users/list', { title: 'Пользователи', users: userModel.getAll() });
});

module.exports = router;
