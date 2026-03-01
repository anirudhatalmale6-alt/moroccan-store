const express = require('express');
const router = express.Router();
const { db } = require('../database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

// ============================================================
// MULTER CONFIGURATIONS
// ============================================================

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
  { name: 'description_images', maxCount: 10 },
  { name: 'audio', maxCount: 1 }
]);

// Variation image upload
const variationStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'variations')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'variation-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const variationUpload = multer({ storage: variationStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Slider image upload
const sliderStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'sliders')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'slider-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const sliderUpload = multer({ storage: sliderStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Gift image upload
const giftStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'gifts')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'gift-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const giftUpload = multer({ storage: giftStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Category image upload
const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'categories')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'category-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const categoryUpload = multer({ storage: categoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Landing page media upload
const landingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'landing-pages')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'landing-' + Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});
const landingUpload = multer({ storage: landingStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ============================================================
// AUTH ROUTES
// ============================================================

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

// ============================================================
// DASHBOARD
// ============================================================

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

// ============================================================
// PRODUCTS
// ============================================================

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
  const { title, description, price, old_price, discount, slug, deposit_amount, features, show_gallery, whatsapp_number, delivery_fee, weight, cod_enabled, bank_full_enabled, bank_deposit_enabled, audio_autoplay } = req.body;
  const videoFilename = req.files && req.files.video ? req.files.video[0].filename : '';
  const mainImageFilename = req.files && req.files.main_image ? req.files.main_image[0].filename : '';
  const audioFilename = req.files && req.files.audio ? req.files.audio[0].filename : '';

  // Description images as JSON array of filenames
  let descriptionImagesJson = '[]';
  if (req.files && req.files.description_images) {
    descriptionImagesJson = JSON.stringify(req.files.description_images.map(f => f.filename));
  }

  // Generate slug if empty
  const finalSlug = slug || title.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') || 'product-' + Date.now();

  try {
    const result = db.prepare(`
      INSERT INTO products (title, description, price, old_price, discount, slug, deposit_amount, video_filename, features, main_image, show_gallery, description_images, whatsapp_number, delivery_fee, weight, audio_filename, audio_autoplay, cod_enabled, bank_full_enabled, bank_deposit_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', finalSlug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]', mainImageFilename, show_gallery === 'on' || show_gallery === '1' ? 1 : 0, descriptionImagesJson, whatsapp_number || '', parseFloat(delivery_fee) || 50, parseFloat(weight) || 0, audioFilename, audio_autoplay === '1' ? 1 : 0, cod_enabled === '1' ? 1 : 0, bank_full_enabled === '1' ? 1 : 0, bank_deposit_enabled === '1' ? 1 : 0);

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
  const variations = db.prepare('SELECT * FROM product_variations WHERE product_id = ? ORDER BY type, sort_order').all(product.id);
  product.variations = variations;
  res.render('admin/product-form', { product });
});

// Update product
router.post('/products/:id', requireAdmin, productFields, (req, res) => {
  const { title, description, price, old_price, discount, slug, deposit_amount, features, is_active, show_gallery, whatsapp_number, delivery_fee, weight, cod_enabled, bank_full_enabled, bank_deposit_enabled, audio_autoplay } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.redirect('/admin/products');

  const videoFilename = req.files && req.files.video ? req.files.video[0].filename : product.video_filename;
  const mainImageFilename = req.files && req.files.main_image ? req.files.main_image[0].filename : (product.main_image || '');
  const audioFilename = req.files && req.files.audio ? req.files.audio[0].filename : (product.audio_filename || '');

  // Handle description images: merge existing with new uploads
  let existingDescImages = [];
  try { existingDescImages = JSON.parse(product.description_images || '[]'); } catch(e) {}
  if (req.files && req.files.description_images) {
    const newDescImages = req.files.description_images.map(f => f.filename);
    existingDescImages = existingDescImages.concat(newDescImages);
  }
  const descriptionImagesJson = JSON.stringify(existingDescImages);

  // Robust is_active handling: checkbox sends '1' or 'on' when checked, nothing when unchecked
  const activeVal = (is_active === '1' || is_active === 'on' || is_active === 1) ? 1 : 0;

  db.prepare(`
    UPDATE products SET title=?, description=?, price=?, old_price=?, discount=?, slug=?, deposit_amount=?, video_filename=?, features=?, is_active=?, main_image=?, show_gallery=?, description_images=?, whatsapp_number=?, delivery_fee=?, weight=?, audio_filename=?, audio_autoplay=?, cod_enabled=?, bank_full_enabled=?, bank_deposit_enabled=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, description || '', parseFloat(price) || 200, parseFloat(old_price) || 0, discount || '', slug, parseFloat(deposit_amount) || 50, videoFilename, features || '[]', activeVal, mainImageFilename, show_gallery === 'on' || show_gallery === '1' ? 1 : 0, descriptionImagesJson, whatsapp_number || '', parseFloat(delivery_fee) || 50, parseFloat(weight) || 0, audioFilename, audio_autoplay === '1' ? 1 : 0, cod_enabled === '1' ? 1 : 0, bank_full_enabled === '1' ? 1 : 0, bank_deposit_enabled === '1' ? 1 : 0, req.params.id);

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
    features.push({ icon: icon || '', title: featureTitle, desc: desc || '' });
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

// Add variation to product
router.post('/products/:id/variation', requireAdmin, variationUpload.single('variation_image'), (req, res) => {
  const { type, label, value, price_adjustment } = req.body;
  if (label) {
    const imageFilename = req.file ? req.file.filename : '';
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM product_variations WHERE product_id = ? AND type = ?').get(req.params.id, type);
    const sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
    db.prepare('INSERT INTO product_variations (product_id, type, label, value, image_filename, price_adjustment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.params.id, type, label, value || '', imageFilename, parseFloat(price_adjustment) || 0, sortOrder);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Delete variation from product
router.post('/products/:id/variation/:varId/delete', requireAdmin, (req, res) => {
  const variation = db.prepare('SELECT * FROM product_variations WHERE id = ? AND product_id = ?').get(req.params.varId, req.params.id);
  if (variation) {
    if (variation.image_filename) {
      const filePath = path.join(__dirname, '..', 'public', 'uploads', 'variations', variation.image_filename);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
    }
    db.prepare('DELETE FROM product_variations WHERE id = ?').run(req.params.varId);
  }
  res.redirect('/admin/products/' + req.params.id + '/edit');
});

// Delete product
router.post('/products/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

// ============================================================
// ORDERS
// ============================================================

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

  // Update referral commissions when order is delivered
  if (status === 'delivered') {
    db.prepare("UPDATE referral_commissions SET status = 'confirmed' WHERE order_id = ?").run(req.params.id);
  }
  // If order is cancelled, cancel commissions and reverse affiliate balance
  if (status === 'cancelled') {
    try {
      const commissions = db.prepare("SELECT * FROM referral_commissions WHERE order_id = ? AND status = 'pending'").all(req.params.id);
      commissions.forEach(c => {
        db.prepare('UPDATE users SET total_earned = total_earned - ?, available_balance = available_balance - ? WHERE id = ?').run(c.commission_amount, c.commission_amount, c.user_id);
      });
    } catch(e) {
      console.error('Commission reversal error:', e);
    }
    db.prepare("UPDATE referral_commissions SET status = 'cancelled' WHERE order_id = ?").run(req.params.id);
  }

  res.redirect('/admin/orders/' + req.params.id);
});

// Delete order
router.post('/orders/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.redirect('/admin/orders');
});

// ============================================================
// REVIEWS
// ============================================================

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

// ============================================================
// BANK TRANSFER SETTINGS
// ============================================================

router.get('/settings/bank', requireAdmin, (req, res) => {
  const banks = db.prepare('SELECT * FROM bank_transfer_settings ORDER BY sort_order, id').all();
  res.render('admin/bank-settings', { banks });
});

router.post('/settings/bank', requireAdmin, (req, res) => {
  const { bank_name, account_holder, rib } = req.body;
  if (bank_name && account_holder && rib) {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM bank_transfer_settings').get();
    const sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
    db.prepare('INSERT INTO bank_transfer_settings (bank_name, account_holder, rib, sort_order) VALUES (?, ?, ?, ?)').run(bank_name, account_holder, rib, sortOrder);
  }
  res.redirect('/admin/settings/bank');
});

router.post('/settings/bank/:id/update', requireAdmin, (req, res) => {
  const { bank_name, account_holder, rib, is_active } = req.body;
  db.prepare('UPDATE bank_transfer_settings SET bank_name=?, account_holder=?, rib=?, is_active=? WHERE id=?').run(bank_name, account_holder, rib, is_active === '1' ? 1 : 0, req.params.id);
  res.redirect('/admin/settings/bank');
});

router.post('/settings/bank/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bank_transfer_settings WHERE id = ?').run(req.params.id);
  res.redirect('/admin/settings/bank');
});

// ============================================================
// GIFT PRODUCTS
// ============================================================

router.get('/gifts', requireAdmin, (req, res) => {
  const gifts = db.prepare('SELECT * FROM gift_products ORDER BY sort_order, id').all();
  res.render('admin/gifts', { gifts });
});

router.post('/gifts', requireAdmin, giftUpload.single('image'), (req, res) => {
  const { name, description, min_order_amount, min_quantity, is_active } = req.body;
  const imageFilename = req.file ? req.file.filename : '';
  if (name) {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM gift_products').get();
    const sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
    db.prepare('INSERT INTO gift_products (name, description, image_filename, min_order_amount, min_quantity, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, description || '', imageFilename, parseFloat(min_order_amount) || 0, parseInt(min_quantity) || 0, is_active === '1' ? 1 : 0, sortOrder);
  }
  res.redirect('/admin/gifts');
});

router.post('/gifts/:id/update', requireAdmin, giftUpload.single('image'), (req, res) => {
  const { name, description, min_order_amount, min_quantity, is_active } = req.body;
  const gift = db.prepare('SELECT * FROM gift_products WHERE id = ?').get(req.params.id);
  if (!gift) return res.redirect('/admin/gifts');
  const imageFilename = req.file ? req.file.filename : gift.image_filename;
  db.prepare('UPDATE gift_products SET name=?, description=?, image_filename=?, min_order_amount=?, min_quantity=?, is_active=? WHERE id=?').run(name, description || '', imageFilename, parseFloat(min_order_amount) || 0, parseInt(min_quantity) || 0, is_active === '1' ? 1 : 0, req.params.id);
  res.redirect('/admin/gifts');
});

router.post('/gifts/:id/delete', requireAdmin, (req, res) => {
  const gift = db.prepare('SELECT * FROM gift_products WHERE id = ?').get(req.params.id);
  if (gift && gift.image_filename) {
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'gifts', gift.image_filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
  }
  db.prepare('DELETE FROM gift_products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/gifts');
});

// ============================================================
// HOME SLIDERS
// ============================================================

router.get('/sliders', requireAdmin, (req, res) => {
  const sliders = db.prepare('SELECT * FROM home_sliders ORDER BY sort_order, id').all();
  res.render('admin/sliders', { sliders });
});

router.post('/sliders', requireAdmin, sliderUpload.single('image'), (req, res) => {
  const { title, link_url, is_active, sort_order } = req.body;
  const imageFilename = req.file ? req.file.filename : '';
  if (imageFilename) {
    db.prepare('INSERT INTO home_sliders (title, image_filename, link_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?)').run(title || '', imageFilename, link_url || '', is_active === '1' ? 1 : 0, parseInt(sort_order) || 0);
  }
  res.redirect('/admin/sliders');
});

router.post('/sliders/:id/update', requireAdmin, sliderUpload.single('image'), (req, res) => {
  const { title, link_url, is_active, sort_order } = req.body;
  const slider = db.prepare('SELECT * FROM home_sliders WHERE id = ?').get(req.params.id);
  if (!slider) return res.redirect('/admin/sliders');
  const imageFilename = req.file ? req.file.filename : slider.image_filename;
  db.prepare('UPDATE home_sliders SET title=?, image_filename=?, link_url=?, is_active=?, sort_order=? WHERE id=?').run(title || '', imageFilename, link_url || '', is_active === '1' ? 1 : 0, parseInt(sort_order) || 0, req.params.id);
  res.redirect('/admin/sliders');
});

router.post('/sliders/:id/delete', requireAdmin, (req, res) => {
  const slider = db.prepare('SELECT * FROM home_sliders WHERE id = ?').get(req.params.id);
  if (slider && slider.image_filename) {
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'sliders', slider.image_filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
  }
  db.prepare('DELETE FROM home_sliders WHERE id = ?').run(req.params.id);
  res.redirect('/admin/sliders');
});

// ============================================================
// LANDING PAGES
// ============================================================

// List landing pages
router.get('/landing-pages', requireAdmin, (req, res) => {
  const pages = db.prepare(`
    SELECT lp.*, p.title as product_title
    FROM landing_pages lp LEFT JOIN products p ON lp.product_id = p.id
    ORDER BY lp.created_at DESC
  `).all();
  res.render('admin/landing-pages', { pages });
});

// New landing page form
router.get('/landing-pages/new', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT id, title FROM products ORDER BY title').all();
  res.render('admin/landing-page-form', { page: null, sections: [], products });
});

// Create landing page
router.post('/landing-pages', requireAdmin, (req, res) => {
  const { title, slug, product_id, payment_type, is_published } = req.body;
  const finalSlug = slug || title.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') || 'page-' + Date.now();
  try {
    db.prepare('INSERT INTO landing_pages (title, slug, product_id, payment_type, is_published) VALUES (?, ?, ?, ?, ?)').run(title, finalSlug, product_id ? parseInt(product_id) : null, payment_type || 'bank', is_published === '1' ? 1 : 0);
    res.redirect('/admin/landing-pages');
  } catch(err) {
    console.error('Create landing page error:', err);
    res.redirect('/admin/landing-pages/new');
  }
});

// Edit landing page form
router.get('/landing-pages/:id/edit', requireAdmin, (req, res) => {
  const page = db.prepare('SELECT * FROM landing_pages WHERE id = ?').get(req.params.id);
  if (!page) return res.redirect('/admin/landing-pages');
  const sections = db.prepare('SELECT * FROM landing_page_sections WHERE landing_page_id = ? ORDER BY sort_order').all(page.id);
  const products = db.prepare('SELECT id, title FROM products ORDER BY title').all();
  res.render('admin/landing-page-form', { page, sections, products });
});

// Update landing page
router.post('/landing-pages/:id', requireAdmin, (req, res) => {
  const { title, slug, product_id, payment_type, is_published } = req.body;
  db.prepare('UPDATE landing_pages SET title=?, slug=?, product_id=?, payment_type=?, is_published=?, updated_at=datetime(\'now\') WHERE id=?').run(title, slug, product_id ? parseInt(product_id) : null, payment_type || 'bank', is_published === '1' ? 1 : 0, req.params.id);
  res.redirect('/admin/landing-pages/' + req.params.id + '/edit');
});

// Add section to landing page
router.post('/landing-pages/:id/section', requireAdmin, landingUpload.single('media'), (req, res) => {
  const { section_type, title, content } = req.body;
  const mediaFilename = req.file ? req.file.filename : '';
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM landing_page_sections WHERE landing_page_id = ?').get(req.params.id);
  const sortOrder = (maxOrder ? maxOrder.max_order : -1) + 1;
  db.prepare('INSERT INTO landing_page_sections (landing_page_id, section_type, title, content, media_filename, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.id, section_type || 'text', title || '', content || '', mediaFilename, sortOrder);
  res.redirect('/admin/landing-pages/' + req.params.id + '/edit');
});

// Update section order
router.post('/landing-pages/:id/section/:sectionId/move', requireAdmin, (req, res) => {
  const { direction } = req.body;
  const sections = db.prepare('SELECT * FROM landing_page_sections WHERE landing_page_id = ? ORDER BY sort_order').all(req.params.id);
  const idx = sections.findIndex(s => s.id == req.params.sectionId);
  if (idx >= 0) {
    if (direction === 'up' && idx > 0) {
      db.prepare('UPDATE landing_page_sections SET sort_order = ? WHERE id = ?').run(sections[idx - 1].sort_order, sections[idx].id);
      db.prepare('UPDATE landing_page_sections SET sort_order = ? WHERE id = ?').run(sections[idx].sort_order, sections[idx - 1].id);
    } else if (direction === 'down' && idx < sections.length - 1) {
      db.prepare('UPDATE landing_page_sections SET sort_order = ? WHERE id = ?').run(sections[idx + 1].sort_order, sections[idx].id);
      db.prepare('UPDATE landing_page_sections SET sort_order = ? WHERE id = ?').run(sections[idx].sort_order, sections[idx + 1].id);
    }
  }
  res.redirect('/admin/landing-pages/' + req.params.id + '/edit');
});

// Delete section
router.post('/landing-pages/:id/section/:sectionId/delete', requireAdmin, (req, res) => {
  const section = db.prepare('SELECT * FROM landing_page_sections WHERE id = ? AND landing_page_id = ?').get(req.params.sectionId, req.params.id);
  if (section && section.media_filename) {
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'landing-pages', section.media_filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
  }
  db.prepare('DELETE FROM landing_page_sections WHERE id = ? AND landing_page_id = ?').run(req.params.sectionId, req.params.id);
  res.redirect('/admin/landing-pages/' + req.params.id + '/edit');
});

// Delete landing page
router.post('/landing-pages/:id/delete', requireAdmin, (req, res) => {
  // Delete associated section files
  const sections = db.prepare('SELECT * FROM landing_page_sections WHERE landing_page_id = ?').all(req.params.id);
  sections.forEach(s => {
    if (s.media_filename) {
      const filePath = path.join(__dirname, '..', 'public', 'uploads', 'landing-pages', s.media_filename);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
    }
  });
  db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
  res.redirect('/admin/landing-pages');
});

// ============================================================
// USERS / AFFILIATES
// ============================================================

router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.render('admin/users', { users });
});

router.get('/users/new', requireAdmin, (req, res) => {
  res.render('admin/user-form', { user: null });
});

router.post('/users', requireAdmin, (req, res) => {
  const { full_name, username, phone, password, commission_rate } = req.body;
  if (!full_name || !username || !password) return res.redirect('/admin/users/new');
  const hash = bcrypt.hashSync(password, 10);
  const referralCode = username.toUpperCase().substring(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase();
  try {
    db.prepare('INSERT INTO users (full_name, username, phone, password_hash, referral_code, commission_rate) VALUES (?, ?, ?, ?, ?, ?)').run(full_name, username, phone || '', hash, referralCode, parseFloat(commission_rate) || 10);
    res.redirect('/admin/users');
  } catch(err) {
    console.error('Create user error:', err);
    res.redirect('/admin/users/new');
  }
});

router.get('/users/:id/edit', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/admin/users');
  res.render('admin/user-form', { user });
});

router.post('/users/:id', requireAdmin, (req, res) => {
  const { full_name, phone, commission_rate, is_active, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/admin/users');

  if (password && password.trim()) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET full_name=?, phone=?, commission_rate=?, is_active=?, password_hash=?, updated_at=datetime(\'now\') WHERE id=?').run(full_name, phone || '', parseFloat(commission_rate) || 10, is_active === '1' ? 1 : 0, hash, req.params.id);
  } else {
    db.prepare('UPDATE users SET full_name=?, phone=?, commission_rate=?, is_active=?, updated_at=datetime(\'now\') WHERE id=?').run(full_name, phone || '', parseFloat(commission_rate) || 10, is_active === '1' ? 1 : 0, req.params.id);
  }
  res.redirect('/admin/users');
});

router.get('/users/:id/stats', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/admin/users');
  const commissions = db.prepare(`
    SELECT rc.*, o.order_ref, o.full_name as customer_name
    FROM referral_commissions rc
    LEFT JOIN orders o ON rc.order_id = o.id
    WHERE rc.user_id = ?
    ORDER BY rc.created_at DESC
  `).all(req.params.id);
  const totalEarned = db.prepare('SELECT COALESCE(SUM(commission_amount), 0) as total FROM referral_commissions WHERE user_id = ?').get(req.params.id).total;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM referral_commissions WHERE user_id = ?').get(req.params.id).c;
  res.render('admin/user-form', { user, commissions, totalEarned, totalOrders, viewStats: true });
});

router.post('/users/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/admin/users');
});

// ============================================================
// WITHDRAWAL REQUESTS
// ============================================================

router.get('/withdrawals', requireAdmin, (req, res) => {
  const status = req.query.status || '';
  let query = `SELECT w.*, u.full_name, u.username, u.phone as user_phone FROM withdrawal_requests w LEFT JOIN users u ON w.user_id = u.id`;
  const params = [];
  if (status) {
    query += ' WHERE w.status = ?';
    params.push(status);
  }
  query += ' ORDER BY w.created_at DESC';
  const withdrawals = db.prepare(query).all(...params);
  res.render('admin/withdrawals', { withdrawals, currentStatus: status });
});

router.post('/withdrawals/:id/approve', requireAdmin, (req, res) => {
  const withdrawal = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(req.params.id);
  if (withdrawal && withdrawal.status === 'pending') {
    db.prepare("UPDATE withdrawal_requests SET status = 'approved', processed_at = datetime('now') WHERE id = ?").run(req.params.id);
    // Update user balance
    db.prepare('UPDATE users SET total_withdrawn = total_withdrawn + ?, available_balance = available_balance - ? WHERE id = ?').run(withdrawal.amount, withdrawal.amount, withdrawal.user_id);
  }
  res.redirect('/admin/withdrawals');
});

router.post('/withdrawals/:id/reject', requireAdmin, (req, res) => {
  const { admin_notes } = req.body;
  const withdrawal = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(req.params.id);
  if (withdrawal && withdrawal.status === 'pending') {
    db.prepare("UPDATE withdrawal_requests SET status = 'rejected', admin_notes = ?, processed_at = datetime('now') WHERE id = ?").run(admin_notes || '', req.params.id);
  }
  res.redirect('/admin/withdrawals');
});

// ============================================================
// ADMIN SETTINGS
// ============================================================

router.get('/settings', requireAdmin, (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.admin.id);
  const settings = {};
  const rows = db.prepare('SELECT * FROM admin_settings').all();
  rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
  const primaryColor = settings.primary_color || '#8B6F47';
  res.render('admin/settings', { admin, settings, primaryColor, success: req.query.success, error: req.query.error });
});

router.post('/settings/profile', requireAdmin, (req, res) => {
  const { email, current_password, new_password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.admin.id);

  // Update email
  if (email !== undefined) {
    db.prepare('UPDATE admins SET email = ? WHERE id = ?').run(email, admin.id);
  }

  // Update password if provided
  if (new_password && new_password.trim()) {
    if (!current_password || !bcrypt.compareSync(current_password, admin.password_hash)) {
      return res.redirect('/admin/settings?error=كلمة المرور الحالية غير صحيحة');
    }
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  }

  res.redirect('/admin/settings?success=تم تحديث البيانات بنجاح');
});

router.post('/settings/typography', requireAdmin, (req, res) => {
  const { font_family, custom_font_url } = req.body;
  // Upsert font_family
  const existingFont = db.prepare("SELECT * FROM admin_settings WHERE setting_key = 'font_family'").get();
  if (existingFont) {
    db.prepare("UPDATE admin_settings SET setting_value = ?, updated_at = datetime('now') WHERE setting_key = 'font_family'").run(font_family || 'Cairo');
  } else {
    db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES ('font_family', ?)").run(font_family || 'Cairo');
  }
  // Upsert custom_font_url
  const existingUrl = db.prepare("SELECT * FROM admin_settings WHERE setting_key = 'custom_font_url'").get();
  if (existingUrl) {
    db.prepare("UPDATE admin_settings SET setting_value = ?, updated_at = datetime('now') WHERE setting_key = 'custom_font_url'").run(custom_font_url || '');
  } else {
    db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES ('custom_font_url', ?)").run(custom_font_url || '');
  }
  res.redirect('/admin/settings?success=تم تحديث اعدادات الخط');
});

router.post('/settings/theme', requireAdmin, (req, res) => {
  const color = req.body.primary_color || req.body.primary_color_text || '#8B6F47';
  const existing = db.prepare("SELECT 1 FROM admin_settings WHERE setting_key = 'primary_color'").get();
  if (existing) {
    db.prepare("UPDATE admin_settings SET setting_value = ? WHERE setting_key = 'primary_color'").run(color);
  } else {
    db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES ('primary_color', ?)").run(color);
  }
  res.redirect('/admin/settings?success=تم تحديث لون المتجر');
});

router.post('/settings/site', requireAdmin, (req, res) => {
  const { site_name } = req.body;
  if (site_name) {
    const existing = db.prepare("SELECT * FROM admin_settings WHERE setting_key = 'site_name'").get();
    if (existing) {
      db.prepare("UPDATE admin_settings SET setting_value = ?, updated_at = datetime('now') WHERE setting_key = 'site_name'").run(site_name);
    } else {
      db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES ('site_name', ?)").run(site_name);
    }
  }
  res.redirect('/admin/settings?success=تم تحديث اعدادات الموقع');
});

// ============================================================
// CATEGORIES
// ============================================================

router.get('/categories', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.render('admin/categories', { categories });
});

router.post('/categories', requireAdmin, categoryUpload.single('image'), (req, res) => {
  const { name, slug } = req.body;
  if (name && slug) {
    const image = req.file ? req.file.filename : '';
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM categories').get();
    db.prepare('INSERT INTO categories (name, slug, image_filename, sort_order) VALUES (?, ?, ?, ?)').run(name, slug, image, (maxOrder.max_order + 1));
  }
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.redirect('/admin/categories');
});

module.exports = router;
