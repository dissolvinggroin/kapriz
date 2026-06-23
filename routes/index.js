const express = require('express');
const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const wishlistModel = require('../models/wishlistModel');

const router = express.Router();

router.get('/', (req, res) => {
  const userId = res.locals.currentUser ? res.locals.currentUser.id : null;

  res.render('index', {
    title: 'Каприз — женская одежда',
    categories: categoryModel.getWithCounts(),
    newArrivals: productModel.getProducts({ sort: 'newest', limit: 8 }),
    saleProducts: productModel.getProducts({ onSale: 1, sort: 'newest', limit: 4 }),
    wishlistIds: wishlistModel.getIds(userId),
    stats: {
      products: productModel.countProducts(),
      rating: productModel.averageRating(),
    },
  });
});

module.exports = router;
