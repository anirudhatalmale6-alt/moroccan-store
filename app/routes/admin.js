const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

// Product file upload
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'products')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const productUpload = multer({ storage: productStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// Login page
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

// Login POST
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.render('admin/login', { error: 'اسم المستخدم أو كلمة المرور خاطئة' });
  }

  req.session.admin = { id: admin.id, username: admin.username };
  res.redirect('/admin');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Dashboard
router.get('/', requireAdmin, (req, res) => {
  const stats = {
    totalProducts: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    totalOrders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    pendingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c,
    pendingReviews: db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status = 'pending'").get().c,
    totalRevenue: db.prepare('SELECT COALESCE(SUM(payment_amount), 0) as total FROM orders').get().total
  };

  const recentOrders = db.prepare(`
    SELECT o.*, p.title as product_title
    FROM orders o LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.created_at DESC LIMIT 5
  `).all();

  const pendingReviews = db.prepare(`
    SELECT r.*, p.title as product_title
    FROM reviews r LEFT JOIN products p ON r.product_id = p.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC LIMIT 5
  `).all();

  res.render('admin/dashboard', { stats, recentOrders, pendingReviews });
});

// Products list
router.get('/products', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.render('admin/products', { products });
});

// New product form
router.get('/products/new', requireAdmin, (req, res) => {
  res.render('admin/product-form', { product: null });
});

// Create product
router.post('/products', requireAdmin, productUpload.single('video'), (req, res) => {
  const { title, description, price, old_price, discount, slug, deposit_amount, features } = req.body;
  const videoFilename = req.file ? req.file.filename : '';

  // Generate slug if empty
  const finalSlug = slug || title.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') || 'product-' + Date.now();

  try {
    db.prepare(`
      INSERT INTO products (title, description, price, old_price, discount, slug, deposit_amount, video_filename, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', finalSlug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]');

    res.redirect('/admin/products');
  } catch (err) {
    console.error('Create product error:', err);
    res.redirect('/admin/products/new');
  }
});

// Edit product form
router.get('/products/:id/edit', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', { product });
});

// Update product
router.post('/products/:id', requireAdmin, productUpload.single('video'), (req, res) => {
  const { title, description, price, old_price, discount, slug, deposit_amount, features, is_active } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');

  const videoFilename = req.file ? req.file.filename : product.video_filename;

  db.prepare(`
    UPDATE products SET title=?, description=?, price=?, old_price=?, discount=?, slug=?, deposit_amount=?, video_filename=?, features=?, is_active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', slug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]', is_active === 'on' ? 1 : 0, req.params.id);

  res.redirect('/admin/products');
});

// Delete product
router.post('/products/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

// Orders list
router.get('/orders', requireAdmin, (req, res) => {
  const status = req.query.status || '';
  let query = `SELECT o.*, p.title as product_title FROM orders o LEFT JOIN products p ON o.product_id = p.id`;
  const params = [];

  if (status) {
    query += ' WHERE o.status = ?';
    params.push(status);
  }
  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.render('admin/orders', { orders, currentStatus: status });
});

// Order detail
router.get('/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, p.title as product_title
    FROM orders o LEFT JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.redirect('/admin/orders');
  res.render('admin/order-detail', { order });
});

// Update order status
router.post('/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/orders/' + req.params.id);
});

// Delete order
router.post('/orders/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.redirect('/admin/orders');
});

// Reviews list
router.get('/reviews', requireAdmin, (req, res) => {
  const status = req.query.status || '';
  let query = `SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id`;
  const params = [];

  if (status) {
    query += ' WHERE r.status = ?';
    params.push(status);
  }
  query += ' ORDER BY r.created_at DESC';

  const reviews = db.prepare(query).all(...params);
  res.render('admin/reviews', { reviews, currentStatus: status });
});

// Approve review
router.post('/reviews/:id/approve', requireAdmin, (req, res) => {
  db.prepare("UPDATE reviews SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/reviews?status=pending');
});

// Reject review
router.post('/reviews/:id/reject', requireAdmin, (req, res) => {
  db.prepare("UPDATE reviews SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/reviews?status=pending');
});

// Delete review
router.post('/reviews/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.redirect('/admin/reviews');
});

module.exports = router;
