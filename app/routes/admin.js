const express = require('express');
const router = express.Router();
const { db } = require('../database');
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
const productFields = productUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'main_image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 20 },
  { name: 'description_images', maxCount: 10 }
]);

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
router.post('/products', requireAdmin, productFields, (req, res) => {
  const { title, description, price, old_price, discount, slug, deposit_amount, features, show_gallery, whatsapp_number, delivery_fee } = req.body;
  const videoFilename = req.files && req.files.video ? req.files.video[0].filename : '';
  const mainImageFilename = req.files && req.files.main_image ? req.files.main_image[0].filename : '';

  // Description images as JSON array of filenames
  let descriptionImagesJson = '[]';
  if (req.files && req.files.description_images) {
    descriptionImagesJson = JSON.stringify(req.files.description_images.map(f => f.filename));
  }

  // Generate slug if empty
  const finalSlug = slug || title.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') || 'product-' + Date.now();

  try {
    const result = db.prepare(`
      INSERT INTO products (title, description, price, old_price, discount, slug, deposit_amount, video_filename, features, main_image, show_gallery, description_images, whatsapp_number, delivery_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', finalSlug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]', mainImageFilename, show_gallery === 'on' || show_gallery === '1' ? 1 : 0, descriptionImagesJson, whatsapp_number || '', parseFloat(delivery_fee) || 50);

    // Insert gallery images into product_images table
    if (req.files && req.files.gallery_images) {
      const productId = result.lastInsertRowid;
      req.files.gallery_images.forEach((file, index) => {
        db.prepare('INSERT INTO product_images (product_id, filename, sort_order) VALUES (?, ?, ?)').run(productId, file.filename, index);
      });
    }

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
  const galleryImages = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(product.id);
  product.gallery_images = galleryImages;
  const faqs = db.prepare('SELECT * FROM product_faqs WHERE product_id = ? ORDER BY sort_order').all(product.id);
  product.faqs = faqs;
  res.render('admin/product-form', { product });
});

// Update product
router.post('/products/:id', requireAdmin, productFields, (req, res) => {
  const { title, description, price, old_price, discount, slug, deposit_amount, features, is_active, show_gallery, whatsapp_number, delivery_fee } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');

  const videoFilename = req.files && req.files.video ? req.files.video[0].filename : product.video_filename;
  const mainImageFilename = req.files && req.files.main_image ? req.files.main_image[0].filename : (product.main_image || '');

  // Handle description images: merge existing with new uploads
  let existingDescImages = [];
  try { existingDescImages = JSON.parse(product.description_images || '[]'); } catch(e) {}
  if (req.files && req.files.description_images) {
    const newDescImages = req.files.description_images.map(f => f.filename);
    existingDescImages = existingDescImages.concat(newDescImages);
  }
  const descriptionImagesJson = JSON.stringify(existingDescImages);

  db.prepare(`
    UPDATE products SET title=?, description=?, price=?, old_price=?, discount=?, slug=?, deposit_amount=?, video_filename=?, features=?, is_active=?, main_image=?, show_gallery=?, description_images=?, whatsapp_number=?, delivery_fee=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', slug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]', is_active === 'on' || is_active === '1' ? 1 : 0, mainImageFilename, show_gallery === 'on' || show_gallery === '1' ? 1 : 0, descriptionImagesJson, whatsapp_number || '', parseFloat(delivery_fee) || 50, req.params.id);

  // Insert new gallery images into product_images table
  if (req.files && req.files.gallery_images) {
    // Get current max sort_order
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM product_images WHERE product_id = ?').get(req.params.id);
    let sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
    req.files.gallery_images.forEach((file) => {
      db.prepare('INSERT INTO product_images (product_id, filename, sort_order) VALUES (?, ?, ?)').run(req.params.id, file.filename, sortOrder++);
    });
  }

  res.redirect('/admin/products');
});

// Delete a gallery image (product_images entry)
router.post('/products/:id/delete-image', requireAdmin, (req, res) => {
  const { image_id } = req.body;
  const image = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(image_id, req.params.id);
  if (image) {
    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'products', image.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
    db.prepare('DELETE FROM product_images WHERE id = ?').run(image_id);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Delete a description image
router.post('/products/:id/delete-desc-image', requireAdmin, (req, res) => {
  const { filename } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (product) {
    let descImages = [];
    try { descImages = JSON.parse(product.description_images || '[]'); } catch(e) {}
    descImages = descImages.filter(img => img !== filename);
    db.prepare('UPDATE products SET description_images = ? WHERE id = ?').run(JSON.stringify(descImages), req.params.id);
    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'products', filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Add FAQ to product
router.post('/products/:id/faq', requireAdmin, (req, res) => {
  const { question, answer } = req.body;
  if (question && answer) {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM product_faqs WHERE product_id = ?').get(req.params.id);
    const sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
    db.prepare('INSERT INTO product_faqs (product_id, question, answer, sort_order) VALUES (?, ?, ?, ?)').run(req.params.id, question, answer, sortOrder);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Update FAQ
router.post('/products/:id/faq/:faqId', requireAdmin, (req, res) => {
  const { question, answer } = req.body;
  db.prepare('UPDATE product_faqs SET question = ?, answer = ? WHERE id = ? AND product_id = ?').run(question, answer, req.params.faqId, req.params.id);
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Delete FAQ
router.post('/products/:id/faq/:faqId/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM product_faqs WHERE id = ? AND product_id = ?').run(req.params.faqId, req.params.id);
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Add feature to product
router.post('/products/:id/feature', requireAdmin, (req, res) => {
  const { icon, featureTitle, desc } = req.body;
  if (featureTitle) {
    const product = db.prepare('SELECT features FROM products WHERE id = ?').get(req.params.id);
    let features = [];
    try { features = JSON.parse(product.features || '[]'); } catch(e) {}
    features.push({ icon: icon || '✨', title: featureTitle, desc: desc || '' });
    db.prepare('UPDATE products SET features = ? WHERE id = ?').run(JSON.stringify(features), req.params.id);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Delete feature from product
router.post('/products/:id/feature/:index/delete', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT features FROM products WHERE id = ?').get(req.params.id);
  let features = [];
  try { features = JSON.parse(product.features || '[]'); } catch(e) {}
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < features.length) {
    features.splice(idx, 1);
    db.prepare('UPDATE products SET features = ? WHERE id = ?').run(JSON.stringify(features), req.params.id);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
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
