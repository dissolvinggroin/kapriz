const userModel = require('../models/userModel');
const wishlistModel = require('../models/wishlistModel');
const cartModel = require('../models/cartModel');

function currentUser(req, res, next) {
  if (req.session && req.session.userId) {
    const user = userModel.findById(req.session.userId);
    res.locals.currentUser = user || null;
    res.locals.wishlistCount = user ? wishlistModel.countByUser(user.id) : 0;
  } else {
    res.locals.currentUser = null;
    res.locals.wishlistCount = 0;
  }
  res.locals.cartCount = req.session ? cartModel.count(req.session) : 0;
  next();
}

module.exports = currentUser;
