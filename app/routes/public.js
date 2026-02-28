const express = require('express');
const router = express.Router();
const { db } = require('../database');
const multer = require('multer');
const path = require('path');

// File upload config for reviews
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'reviews')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'review-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const reviewUpload = multer({
  storage: reviewStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, /^image\//.test(file.mimetype));
    } else if (file.fieldname === 'audio') {
      cb(null, /^audio\/|^video\/webm/.test(file.mimetype));
    } else {
      cb(null, false);
    }
  }
});

// Receipt upload config
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'receipts')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'receipt-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Home — redirect to first product or show products list
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC').all();
  if (products.length === 1) {
    return res.redirect('/product/' + products[0].slug);
  }
  res.render('home', { products });
});

// Product landing page
router.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  const reviews = db.prepare(
    'SELECT name, rating, message, image_filename, audio_filename, created_at FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(product.id, 'approved');

  const avgRating = db.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ? AND status = ?'
  ).get(product.id, 'approved');

  product.features = JSON.parse(product.features || '[]');

  res.render('product', {
    product,
    reviews,
    avgRating: avgRating.avg ? avgRating.avg.toFixed(1) : '5.0',
    reviewCount: avgRating.count || 0
  });
});

// Product checkout page
router.get('/product/:slug/checkout', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  res.render('checkout', { product });
});

// Product reviews page
router.get('/product/:slug/reviews', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  const reviews = db.prepare(
    'SELECT name, rating, message, image_filename, audio_filename, created_at FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(product.id, 'approved');

  const avgRating = db.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ? AND status = ?'
  ).get(product.id, 'approved');

  res.render('reviews', {
    product,
    reviews,
    avgRating: avgRating.avg ? avgRating.avg.toFixed(1) : '5.0',
    reviewCount: avgRating.count || 0
  });
});

// Submit order
router.post('/product/:slug/order', receiptUpload.single('receipt'), (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { fullName, phone, quantity, deliveryOption } = req.body;
    const qty = parseInt(quantity) || 1;
    const totalPrice = qty * product.price;
    const isDeposit = deliveryOption === 'deposit';
    const paymentAmount = isDeposit ? product.deposit_amount : totalPrice;
    const remainingAmount = isDeposit ? totalPrice - product.deposit_amount : 0;

    const orderRef = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    db.prepare(`
      INSERT INTO orders (product_id, order_ref, full_name, phone, quantity, unit_price, total_price, delivery_option, payment_amount, remaining_amount, receipt_filename, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.id, orderRef, fullName, '+212' + phone, qty, product.price,
      totalPrice, deliveryOption, paymentAmount, remainingAmount,
      req.file ? req.file.filename : '', 'pending'
    );

    // Telegram notification (placeholder)
    // sendTelegramNotification(orderRef, fullName, phone, qty, paymentAmount, deliveryOption);

    res.json({ success: true, orderRef });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit review
router.post('/product/:slug/review', reviewUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, phone, rating, message } = req.body;
    const imageFile = req.files && req.files.image ? req.files.image[0].filename : '';
    const audioFile = req.files && req.files.audio ? req.files.audio[0].filename : '';

    db.prepare(`
      INSERT INTO reviews (product_id, name, phone, rating, message, image_filename, audio_filename, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, name, phone || '', parseInt(rating) || 5, message, imageFile, audioFile, 'pending');

    res.json({ success: true });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Thank you page
router.get('/thankyou', (req, res) => {
  res.render('thankyou');
});

module.exports = router;
