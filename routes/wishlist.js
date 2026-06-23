const express = require('express');
const { requireAuth } = require('../middleware/auth');
const wishlistModel = require('../models/wishlistModel');
const productModel = require('../models/productModel');

const router = express.Router();

// AJAX-переключение избранного (сердечко)
router.post('/:id/toggle', requireAuth, (req, res) => {
  const product = productModel.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'not_found' });

  const active = wishlistModel.toggle(res.locals.currentUser.id, product.id);
  const count = wishlistModel.countByUser(res.locals.currentUser.id);
  res.json({ active, count });
});

module.exports = router;
