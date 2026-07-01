require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);

const db = require('./db/database');
const format = require('./utils/format');
const currentUser = require('./middleware/currentUser');
const categoryModel = require('./models/categoryModel');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('trust proxy', 1);

// Версия статики для сброса кэша браузера (меняется при каждом перезапуске)
const ASSET_VER = Date.now();

app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
      // CSS/JS не кэшируем агрессивно, чтобы правки сразу доезжали; картинки кэшируем
      if (/\.(css|js)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET must be set in production');
}

app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: { clear: true, intervalMs: 1000 * 60 * 60 * 24 },
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  })
);

app.use(currentUser);

// Глобальные хелперы и данные для шаблонов
app.use((req, res, next) => {
  // HTML/динамику не кэшируем — страница всегда ссылается на свежие CSS/JS
  res.set('Cache-Control', 'no-store');
  res.locals.formatPrice = format.formatPrice;
  res.locals.colorHex = format.colorHex;
  res.locals.splitCsv = format.splitCsv;
  res.locals.discountPercent = format.discountPercent;
  res.locals.imageFallback = format.imageFallback;
  res.locals.picsumFallback = format.imageFallback; // обратная совместимость со старыми вызовами
  res.locals.formatDate = format.formatDate;
  res.locals.stockInfo = format.stockInfo;
  res.locals.assetVer = ASSET_VER;
  res.locals.navCategories = categoryModel.getAll();
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  next();
});

app.use(require('./middleware/csrf'));

app.use('/', require('./routes/index'));
app.use('/catalog', require('./routes/catalog'));
app.use('/cart', require('./routes/cart'));
app.use('/', require('./routes/auth'));
app.use('/account', require('./routes/account'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/', require('./routes/pages'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Страница не найдена' });
});

app.use((err, req, res, next) => {
  console.error(err);
  // сбрасываем возможный админский лейаут, чтобы страница ошибки была публичной
  res.locals.layout = 'layouts/main';
  res.status(500).render('errors/500', { title: 'Ошибка сервера' });
});

module.exports = app;
