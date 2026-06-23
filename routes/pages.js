const express = require('express');

const router = express.Router();

router.get('/about', (req, res) => {
  res.render('pages/about', { title: 'О бренде' });
});

router.get('/contacts', (req, res) => {
  res.render('pages/contacts', { title: 'Контакты' });
});

router.get('/delivery', (req, res) => {
  res.render('pages/delivery', { title: 'Доставка и оплата' });
});

router.get('/returns', (req, res) => {
  res.render('pages/returns', { title: 'Обмен и возврат' });
});

router.get('/faq', (req, res) => {
  res.render('pages/faq', { title: 'Частые вопросы' });
});

module.exports = router;
