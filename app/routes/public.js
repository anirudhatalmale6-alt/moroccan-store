const express = require('express');
const router = express.Router();
const { db } = require('../database');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { requireUser } = require('../middleware/userAuth');

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
    if (file.fieldname === 'images' || file.fieldname === 'image') {
      cb(null, /^image\//.test(file.mimetype));
    } else if (file.fieldname === 'audio') {
      // Accept all audio types + video/webm (Chrome records as video/webm) + application/octet-stream (some mobile browsers)
      cb(null, /^audio\/|^video\/webm|^video\/mp4|^application\/octet-stream/.test(file.mimetype));
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

// ============================================================
// Helper: Get bank settings from DB
// ============================================================
function getBankSettings() {
  try {
    return db.prepare('SELECT * FROM bank_transfer_settings WHERE is_active = 1 ORDER BY sort_order').all();
  } catch (e) {
    return [];
  }
}

// Helper: Get eligible gift products for a total
function getEligibleGift(totalAmount) {
  try {
    return db.prepare(
      'SELECT * FROM gift_products WHERE is_active = 1 AND min_order_amount <= ? ORDER BY min_order_amount DESC LIMIT 1'
    ).get(totalAmount);
  } catch (e) {
    return undefined;
  }
}

// Helper: Get product variations
function getVariations(productId, type) {
  try {
    return db.prepare(
      'SELECT * FROM product_variations WHERE product_id = ? AND type = ? AND is_active = 1 ORDER BY sort_order'
    ).all(productId, type);
  } catch (e) {
    return [];
  }
}

// Helper: Generate order ref
function generateOrderRef() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Helper: Get admin setting
function getSetting(key, defaultValue) {
  try {
    const row = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get(key);
    return row ? row.setting_value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}


// ============================================================
// API: Get paginated products
// ============================================================
router.get('/api/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();

  let banners = [];
  let bannerInterval = 4;
  try {
    banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order').all();
    const intervalRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'banner_interval'").get();
    if (intervalRow) bannerInterval = parseInt(intervalRow.setting_value) || 4;
  } catch (e) {}

  res.json({ products, total: total.count, page, hasMore: offset + products.length < total.count, banners, bannerInterval });
});


// ============================================================
// API: Get cart data (for drawer)
// ============================================================
router.get('/api/cart', (req, res) => {
  const sessionId = req.sessionID;
  const rawItems = db.prepare(`
    SELECT ci.*, p.title, p.slug, p.price, p.main_image
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.session_id = ?
    ORDER BY ci.created_at
  `).all(sessionId);

  let cartTotal = 0;
  const items = rawItems.map(item => {
    let unitPrice = item.price;
    let sizeLabel = '';
    let colorLabel = '';

    if (item.variation_size_id) {
      const sv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_size_id);
      if (sv) { unitPrice += sv.price_adjustment; sizeLabel = sv.label; }
    }
    if (item.variation_color_id) {
      const cv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_color_id);
      if (cv) { unitPrice += cv.price_adjustment; colorLabel = cv.label; }
    }

    const subtotal = unitPrice * item.quantity;
    cartTotal += subtotal;

    return {
      id: item.id,
      product_id: item.product_id,
      title: item.title,
      slug: item.slug,
      main_image: item.main_image,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal,
      size_label: sizeLabel,
      color_label: colorLabel
    };
  });

  const giftProduct = getEligibleGift(cartTotal);
  const currency = (typeof req.res.locals.t === 'function') ? req.res.locals.t('currency') : 'د.م';

  res.json({ items, cartTotal, giftProduct, currency });
});

// ============================================================
// HOME PAGE
// ============================================================
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC').all();
  if (products.length === 1) {
    return res.redirect('/product/' + products[0].slug);
  }

  let sliders = [];
  try {
    sliders = db.prepare('SELECT * FROM home_sliders WHERE is_active = 1 ORDER BY sort_order').all();
  } catch (e) {}

  let categories = [];
  try {
    categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all();
  } catch (e) {}

  let banners = [];
  let bannerInterval = 4;
  try {
    banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order').all();
    const intervalRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'banner_interval'").get();
    if (intervalRow) bannerInterval = parseInt(intervalRow.setting_value) || 4;
  } catch (e) {}

  // Load latest reviews for feedback section
  let latestReviews = [];
  let homeReviewCount = 0;
  try {
    latestReviews = db.prepare(
      'SELECT r.name, r.rating, r.message, r.image_filename, r.audio_filename, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ? AND r.image_filename IS NOT NULL AND r.image_filename != \'\' ORDER BY r.created_at DESC LIMIT 6'
    ).all('approved');
    const rc = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE status = ?').get('approved');
    homeReviewCount = rc ? rc.count : 0;
  } catch (e) {}

  // Load collections with their products
  let collections = [];
  try {
    const rawCollections = db.prepare('SELECT * FROM collections WHERE is_active = 1 ORDER BY sort_order').all();
    rawCollections.forEach(col => {
      let colProducts = [];
      const limit = Math.max(col.grid_product_count || 6, col.slider_product_count || 10);
      if (col.category_id) {
        colProducts = db.prepare('SELECT * FROM products WHERE is_active = 1 AND category_id = ? ORDER BY created_at DESC LIMIT ?').all(col.category_id, limit);
      } else {
        colProducts = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?').all(limit);
      }
      // Get category info for "view all" link
      let categorySlug = null;
      if (col.category_id) {
        const cat = db.prepare('SELECT slug FROM categories WHERE id = ?').get(col.category_id);
        if (cat) categorySlug = cat.slug;
      }
      collections.push({ ...col, products: colProducts, categorySlug });
    });
  } catch (e) {}

  const useCollections = collections.length > 0;

  res.render('home', { products, sliders, categories, banners, bannerInterval, latestReviews, homeReviewCount, collections, useCollections });
});


// ============================================================
// CATEGORY PAGE
// ============================================================
router.get('/category/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!category) return res.status(404).render('404');

  const products = db.prepare('SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY created_at DESC').all(category.id);

  let sliders = [];
  try { sliders = db.prepare('SELECT * FROM home_sliders WHERE is_active = 1 ORDER BY sort_order').all(); } catch(e) {}

  let categories = [];
  try { categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all(); } catch(e) {}

  let banners = [];
  let bannerInterval = 4;
  try {
    banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order').all();
    const intervalRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'banner_interval'").get();
    if (intervalRow) bannerInterval = parseInt(intervalRow.setting_value) || 4;
  } catch (e) {}

  res.render('home', { products, sliders, categories, currentCategory: category, banners, bannerInterval });
});

// ============================================================
// PRODUCT LANDING PAGE
// ============================================================
router.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  const reviews = db.prepare(
    'SELECT name, phone, rating, message, image_filename, audio_filename, created_at FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(product.id, 'approved');

  const avgRating = db.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ? AND status = ?'
  ).get(product.id, 'approved');

  product.features = JSON.parse(product.features || '[]');

  const galleryImages = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(product.id);
  const faqs = db.prepare('SELECT * FROM product_faqs WHERE product_id = ? ORDER BY sort_order').all(product.id);
  const sizeVariations = getVariations(product.id, 'size');
  const colorVariations = getVariations(product.id, 'color');

  res.render('product', {
    product,
    reviews,
    galleryImages,
    faqs,
    sizeVariations,
    colorVariations,
    avgRating: avgRating.avg ? avgRating.avg.toFixed(1) : '5.0',
    reviewCount: avgRating.count || 0
  });
});


// ============================================================
// PRODUCT CHECKOUT PAGE
// ============================================================
router.get('/product/:slug/checkout', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  const bankSettings = getBankSettings();
  const sizeVariations = getVariations(product.id, 'size');
  const colorVariations = getVariations(product.id, 'color');

  res.render('checkout', {
    product,
    bankSettings,
    sizeVariations,
    colorVariations,
    checkoutMode: 'single'
  });
});


// ============================================================
// PRODUCT REVIEWS PAGE
// ============================================================
router.get('/product/:slug/reviews', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');

  const reviews = db.prepare(
    'SELECT name, phone, rating, message, image_filename, audio_filename, created_at FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC'
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


// ============================================================
// SUBMIT ORDER (single product)
// ============================================================
router.post('/product/:slug/order', receiptUpload.single('receipt'), (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { fullName, phone, quantity, payment_type, city, address, variation_info } = req.body;
    const qty = parseInt(quantity) || 1;

    // Calculate price with variation adjustments
    let unitPrice = product.price;
    if (req.body.size_variation_id) {
      const sv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(req.body.size_variation_id);
      if (sv) unitPrice += sv.price_adjustment;
    }
    if (req.body.color_variation_id) {
      const cv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(req.body.color_variation_id);
      if (cv) unitPrice += cv.price_adjustment;
    }

    const totalPrice = qty * unitPrice;
    const paymentType = payment_type || 'bank_full';
    const isCod = paymentType === 'cod';
    const isDeposit = paymentType === 'bank_deposit';

    let paymentAmount = totalPrice;
    let remainingAmount = 0;
    let deliveryOption = 'full';

    if (isDeposit) {
      paymentAmount = product.deposit_amount;
      remainingAmount = totalPrice - product.deposit_amount + (product.delivery_fee || 50);
      deliveryOption = 'deposit';
    } else if (isCod) {
      deliveryOption = 'cod';
    }

    const orderRef = generateOrderRef();

    // Determine referral code from session
    const referralCode = req.session.referral_code || '';

    // Check gift eligibility
    const gift = getEligibleGift(totalPrice);
    const giftInfo = gift ? JSON.stringify({ name: gift.name, description: gift.description }) : '';

    db.prepare(`
      INSERT INTO orders (product_id, order_ref, full_name, phone, quantity, unit_price, total_price,
        delivery_option, payment_amount, remaining_amount, receipt_filename, status,
        payment_type, variation_info, referral_code, gift_info, city, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.id, orderRef, fullName, phone, qty, unitPrice,
      totalPrice, deliveryOption, paymentAmount, remainingAmount,
      req.file ? req.file.filename : '', 'pending',
      paymentType, variation_info || '', referralCode, giftInfo,
      city || '', address || ''
    );

    // Handle referral commission
    if (referralCode) {
      try {
        const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ? AND is_active = 1').get(referralCode);
        if (referrer) {
          const orderId = db.prepare('SELECT id FROM orders WHERE order_ref = ?').get(orderRef);
          const commissionRate = referrer.commission_rate || 10;
          const commissionAmount = totalPrice * (commissionRate / 100);

          db.prepare(`
            INSERT INTO referral_commissions (user_id, order_id, order_amount, commission_rate, commission_amount, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(referrer.id, orderId.id, totalPrice, commissionRate, commissionAmount, 'pending');

          // Update user stats
          db.prepare(`
            UPDATE users SET total_earned = total_earned + ?, available_balance = available_balance + ?,
              total_orders = total_orders + 1, updated_at = datetime('now')
            WHERE id = ?
          `).run(commissionAmount, commissionAmount, referrer.id);
        }
      } catch (refErr) {
        console.error('Referral commission error:', refErr);
      }
    }

    res.json({ success: true, orderRef });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================================
// SUBMIT REVIEW
// ============================================================
router.post('/product/:slug/review', reviewUpload.fields([
  { name: 'image', maxCount: 3 },
  { name: 'images', maxCount: 3 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, phone, rating, message } = req.body;
    // Accept images from either 'image' or 'images' field name
    const imageFiles = (req.files && req.files.image) || (req.files && req.files.images) || [];
    const hasImages = imageFiles.length > 0;
    const hasAudio = req.files && req.files.audio && req.files.audio.length > 0;
    const hasMessage = message && message.trim();

    // Validation: at least one of text/audio/image required
    if (!hasMessage && !hasImages && !hasAudio) {
      return res.status(400).json({ error: 'يرجى إضافة نص أو صورة أو تعليق صوتي على الأقل' });
    }

    // Store all image filenames as JSON array if multiple, or single string for backward compat
    let imageFile = '';
    if (hasImages) {
      if (imageFiles.length === 1) {
        imageFile = imageFiles[0].filename;
      } else {
        imageFile = JSON.stringify(imageFiles.map(f => f.filename));
      }
    }
    const audioFile = hasAudio ? req.files.audio[0].filename : '';

    db.prepare(`
      INSERT INTO reviews (product_id, name, phone, rating, message, image_filename, audio_filename, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, name, phone || '', parseInt(rating) || 5, message || '', imageFile, audioFile, 'pending');

    res.json({ success: true });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================================
// CART SYSTEM
// ============================================================

// GET /cart — render cart page
router.get('/cart', (req, res) => {
  const sessionId = req.sessionID;

  const rawItems = db.prepare(`
    SELECT ci.*, p.title, p.slug, p.price, p.main_image
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.session_id = ?
    ORDER BY ci.created_at
  `).all(sessionId);

  // Enrich with variation info and calculate prices
  let cartTotal = 0;
  const items = rawItems.map(item => {
    let unitPrice = item.price;
    let sizeLabel = '';
    let colorLabel = '';

    if (item.variation_size_id) {
      const sv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_size_id);
      if (sv) { unitPrice += sv.price_adjustment; sizeLabel = sv.label; }
    }
    if (item.variation_color_id) {
      const cv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_color_id);
      if (cv) { unitPrice += cv.price_adjustment; colorLabel = cv.label; }
    }

    const subtotal = unitPrice * item.quantity;
    cartTotal += subtotal;

    return {
      ...item,
      unit_price: unitPrice,
      subtotal,
      size_label: sizeLabel,
      color_label: colorLabel
    };
  });

  const giftProduct = getEligibleGift(cartTotal);

  res.render('cart', { items, cartTotal, giftProduct });
});

// POST /cart/add
router.post('/cart/add', (req, res) => {
  try {
    const { product_id, quantity, size_variation_id, color_variation_id } = req.body;
    const sessionId = req.sessionID;
    const qty = parseInt(quantity) || 1;

    // Check product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(product_id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    // Check if already in cart with same variations
    const existing = db.prepare(
      'SELECT * FROM cart_items WHERE session_id = ? AND product_id = ? AND variation_size_id IS ? AND variation_color_id IS ?'
    ).get(sessionId, product_id, size_variation_id || null, color_variation_id || null);

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id);
    } else {
      db.prepare(
        'INSERT INTO cart_items (session_id, product_id, variation_size_id, variation_color_id, quantity) VALUES (?, ?, ?, ?, ?)'
      ).run(sessionId, product_id, size_variation_id || null, color_variation_id || null, qty);
    }

    // Get cart count
    const countRow = db.prepare('SELECT SUM(quantity) as total FROM cart_items WHERE session_id = ?').get(sessionId);
    const cartCount = countRow ? countRow.total : 0;

    res.json({ success: true, cartCount });
  } catch (err) {
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cart/update
router.post('/cart/update', (req, res) => {
  try {
    const { item_id, quantity } = req.body;
    const sessionId = req.sessionID;
    const qty = parseInt(quantity) || 1;

    if (qty < 1) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, sessionId);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?').run(qty, item_id, sessionId);
    }

    const countRow = db.prepare('SELECT SUM(quantity) as total FROM cart_items WHERE session_id = ?').get(sessionId);
    const cartCount = countRow ? countRow.total : 0;
    res.json({ success: true, cartCount });
  } catch (err) {
    console.error('Cart update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /cart/remove
router.post('/cart/remove', (req, res) => {
  try {
    const { item_id } = req.body;
    const sessionId = req.sessionID;
    db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(item_id, sessionId);
    res.json({ success: true });
  } catch (err) {
    console.error('Cart remove error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /cart/checkout — render checkout for cart
router.get('/cart/checkout', (req, res) => {
  const sessionId = req.sessionID;

  const rawItems = db.prepare(`
    SELECT ci.*, p.title, p.slug, p.price, p.main_image, p.cod_enabled, p.deposit_amount, p.delivery_fee
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.session_id = ?
    ORDER BY ci.created_at
  `).all(sessionId);

  if (!rawItems || rawItems.length === 0) {
    return res.redirect('/cart');
  }

  let cartTotal = 0;
  let cartHasCod = false;
  const cartItems = rawItems.map(item => {
    let unitPrice = item.price;
    let sizeLabel = '';
    let colorLabel = '';

    if (item.variation_size_id) {
      const sv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_size_id);
      if (sv) { unitPrice += sv.price_adjustment; sizeLabel = sv.label; }
    }
    if (item.variation_color_id) {
      const cv = db.prepare('SELECT label, price_adjustment FROM product_variations WHERE id = ?').get(item.variation_color_id);
      if (cv) { unitPrice += cv.price_adjustment; colorLabel = cv.label; }
    }

    const subtotal = unitPrice * item.quantity;
    cartTotal += subtotal;
    if (item.cod_enabled) cartHasCod = true;

    return {
      ...item,
      unit_price: unitPrice,
      subtotal,
      size_label: sizeLabel,
      color_label: colorLabel
    };
  });

  const bankSettings = getBankSettings();
  const giftProduct = getEligibleGift(cartTotal);

  res.render('checkout', {
    checkoutMode: 'cart',
    cartItems,
    cartTotal,
    cartHasCod,
    bankSettings,
    giftProduct
  });
});

// POST /cart/checkout — submit cart order
router.post('/cart/checkout', receiptUpload.single('receipt'), (req, res) => {
  try {
    const sessionId = req.sessionID;
    const { fullName, phone, payment_type, city, address } = req.body;

    const rawItems = db.prepare(`
      SELECT ci.*, p.title, p.price, p.id as pid
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = ?
    `).all(sessionId);

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ error: 'السلة فارغة' });
    }

    let cartTotal = 0;
    rawItems.forEach(item => {
      let unitPrice = item.price;
      if (item.variation_size_id) {
        const sv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(item.variation_size_id);
        if (sv) unitPrice += sv.price_adjustment;
      }
      if (item.variation_color_id) {
        const cv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(item.variation_color_id);
        if (cv) unitPrice += cv.price_adjustment;
      }
      cartTotal += unitPrice * item.quantity;
    });

    const paymentType = payment_type || 'bank_full';
    const isCod = paymentType === 'cod';
    const orderRef = generateOrderRef();
    const referralCode = req.session.referral_code || '';

    // Check gift
    const gift = getEligibleGift(cartTotal);
    const giftInfo = gift ? JSON.stringify({ name: gift.name }) : '';

    // Build variation info
    const variationDetails = rawItems.map(item => {
      const info = { product_id: item.pid, title: item.title, quantity: item.quantity };
      if (item.variation_size_id) {
        const sv = db.prepare('SELECT label FROM product_variations WHERE id = ?').get(item.variation_size_id);
        if (sv) info.size = sv.label;
      }
      if (item.variation_color_id) {
        const cv = db.prepare('SELECT label FROM product_variations WHERE id = ?').get(item.variation_color_id);
        if (cv) info.color = cv.label;
      }
      return info;
    });

    // Create order for first product (primary), store all details in variation_info
    db.prepare(`
      INSERT INTO orders (product_id, order_ref, full_name, phone, quantity, unit_price, total_price,
        delivery_option, payment_amount, remaining_amount, receipt_filename, status,
        payment_type, variation_info, referral_code, gift_info, city, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rawItems[0].pid, orderRef, fullName, phone,
      rawItems.reduce((sum, i) => sum + i.quantity, 0),
      0, cartTotal,
      isCod ? 'cod' : 'full',
      cartTotal, 0,
      req.file ? req.file.filename : '', 'pending',
      paymentType, JSON.stringify(variationDetails), referralCode, giftInfo,
      city || '', address || ''
    );

    // Handle referral commission
    if (referralCode) {
      try {
        const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ? AND is_active = 1').get(referralCode);
        if (referrer) {
          const orderId = db.prepare('SELECT id FROM orders WHERE order_ref = ?').get(orderRef);
          const commissionRate = referrer.commission_rate || 10;
          const commissionAmount = cartTotal * (commissionRate / 100);
          db.prepare(`
            INSERT INTO referral_commissions (user_id, order_id, order_amount, commission_rate, commission_amount, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(referrer.id, orderId.id, cartTotal, commissionRate, commissionAmount, 'pending');
          db.prepare(`
            UPDATE users SET total_earned = total_earned + ?, available_balance = available_balance + ?,
              total_orders = total_orders + 1, updated_at = datetime('now')
            WHERE id = ?
          `).run(commissionAmount, commissionAmount, referrer.id);
        }
      } catch (refErr) {
        console.error('Referral commission error:', refErr);
      }
    }

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);

    res.json({ success: true, orderRef });
  } catch (err) {
    console.error('Cart checkout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================================
// LANDING PAGES
// ============================================================
router.get('/p/:slug', (req, res) => {
  try {
    const landingPage = db.prepare('SELECT * FROM landing_pages WHERE slug = ? AND is_published = 1').get(req.params.slug);
    if (!landingPage) return res.status(404).render('404');

    // Track page view
    try { db.prepare('UPDATE landing_pages SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(landingPage.id); } catch(e) {}

    let product = null;
    if (landingPage.product_id) {
      product = db.prepare('SELECT * FROM products WHERE id = ?').get(landingPage.product_id);
    }

    const sections = db.prepare(
      'SELECT * FROM landing_page_sections WHERE landing_page_id = ? AND is_visible = 1 ORDER BY sort_order'
    ).all(landingPage.id);

    const bankSettings = getBankSettings();

    // Load reviews if show_reviews is enabled and product is linked
    let lpReviews = [];
    let lpAvgRating = '5.0';
    let lpReviewCount = 0;
    if (landingPage.show_reviews && product) {
      lpReviews = db.prepare(
        'SELECT name, phone, rating, message, image_filename, audio_filename, created_at FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC'
      ).all(product.id, 'approved');
      const avgRow = db.prepare(
        'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ? AND status = ?'
      ).get(product.id, 'approved');
      lpAvgRating = avgRow && avgRow.avg ? avgRow.avg.toFixed(1) : '5.0';
      lpReviewCount = avgRow ? avgRow.count : 0;
    }

    res.render('landing-page', { landingPage, product, sections, bankSettings, lpReviews, lpAvgRating, lpReviewCount });
  } catch (err) {
    console.error('Landing page error:', err);
    res.status(500).render('404');
  }
});


// ============================================================
// USER/AFFILIATE SYSTEM
// ============================================================

// GET /login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/account');
  res.render('login');
});

// POST /login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      referral_code: user.referral_code
    };

    res.json({ success: true, redirect: '/account' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /account
router.get('/account', requireUser, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user) {
      req.session.user = null;
      return res.redirect('/login');
    }

    const commissions = db.prepare(
      'SELECT * FROM referral_commissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(user.id);

    const minOrders = parseInt(getSetting('min_withdrawal_orders', '20'));

    // Build site URL
    const siteUrl = req.protocol + '://' + req.get('host');

    res.render('account', { user, commissions, minOrders, siteUrl });
  } catch (err) {
    console.error('Account error:', err);
    res.status(500).render('404');
  }
});

// GET /account/settings
router.get('/account/settings', requireUser, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user) {
      req.session.user = null;
      return res.redirect('/login');
    }
    res.render('account-settings', { user });
  } catch (err) {
    console.error('Account settings error:', err);
    res.status(500).render('404');
  }
});

// POST /account/settings (change password or update whatsapp)
router.post('/account/settings', requireUser, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { action } = req.body;

    if (action === 'change_password') {
      const { current_password, new_password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      if (!bcrypt.compareSync(current_password, user.password_hash)) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }

      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      }

      const hash = bcrypt.hashSync(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, userId);

      return res.json({ success: true });
    }

    if (action === 'update_whatsapp') {
      const { whatsapp } = req.body;
      db.prepare('UPDATE users SET whatsapp = ?, updated_at = datetime(\'now\') WHERE id = ?').run(whatsapp || '', userId);
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /account/withdraw
router.post('/account/withdraw', requireUser, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { amount, bank_name, holder_name, rib } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال مبلغ صحيح' });
    }
    if (withdrawAmount > user.available_balance) {
      return res.status(400).json({ error: 'المبلغ أكبر من الرصيد المتاح' });
    }

    const minOrders = parseInt(getSetting('min_withdrawal_orders', '20'));
    if (user.total_orders < minOrders) {
      return res.status(400).json({ error: `يجب أن يكون لديك على الأقل ${minOrders} طلب للسحب` });
    }

    if (!bank_name || !holder_name || !rib) {
      return res.status(400).json({ error: 'يرجى تعبئة جميع حقول البنك' });
    }

    // Create withdrawal request
    db.prepare(`
      INSERT INTO withdrawal_requests (user_id, amount, rib, bank_name, holder_name, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, withdrawAmount, rib, bank_name, holder_name, 'pending');

    // Deduct from available balance
    db.prepare('UPDATE users SET available_balance = available_balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(withdrawAmount, userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/login');
});


// ============================================================
// AFFILIATE ORDER MANAGEMENT
// ============================================================

// GET /account/orders — list orders referred by this affiliate
router.get('/account/orders', requireUser, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user) {
      req.session.user = null;
      return res.redirect('/login');
    }

    const orders = db.prepare(`
      SELECT o.*, p.title as product_title
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.referral_code = ?
      ORDER BY o.created_at DESC
    `).all(user.referral_code);

    res.render('affiliate-orders', { user, orders });
  } catch (err) {
    console.error('Affiliate orders error:', err);
    res.status(500).render('404');
  }
});

// POST /account/orders/:id/status — affiliate can confirm new orders
router.post('/account/orders/:id/status', requireUser, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user) return res.status(401).json({ error: 'غير مصرح' });

    const { status } = req.body;

    // Affiliate can only change: new/pending -> confirmed
    if (status !== 'confirmed') {
      return res.status(400).json({ error: 'لا يمكنك تغيير الحالة إلى هذه القيمة' });
    }

    // Verify the order belongs to this affiliate's referral code
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND referral_code = ?').get(req.params.id, user.referral_code);
    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    // Only allow changing from pending/new to confirmed
    if (order.status !== 'pending' && order.status !== 'new') {
      return res.status(400).json({ error: 'لا يمكن تأكيد هذا الطلب في حالته الحالية' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('confirmed', req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Affiliate order status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// REFERRAL TRACKING
// ============================================================
// Capture /:username as referral (must be last route to avoid conflicts)
// This is placed near the bottom but before thank you and static pages


// ============================================================
// PUBLIC FEEDBACK PAGE (all reviews from all products)
// ============================================================
router.get('/feedback', (req, res) => {
  const reviews = db.prepare(
    'SELECT r.name, r.phone, r.rating, r.message, r.image_filename, r.audio_filename, r.created_at, p.title as product_title FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.status = ? ORDER BY r.created_at DESC'
  ).all('approved');

  const avgRow = db.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE status = ?'
  ).get('approved');

  res.render('feedback', {
    reviews,
    avgRating: avgRow && avgRow.avg ? avgRow.avg.toFixed(1) : '5.0',
    reviewCount: avgRow ? avgRow.count : 0
  });
});


// ============================================================
// THANK YOU + STATIC PAGES
// ============================================================
router.get('/thankyou', (req, res) => {
  res.render('thankyou');
});

router.get('/returns', (req, res) => {
  res.render('returns');
});

router.get('/payment-delivery', (req, res) => {
  res.render('payment-delivery');
});

router.get('/contact', (req, res) => {
  const product = db.prepare('SELECT whatsapp_number FROM products WHERE is_active = 1 LIMIT 1').get();
  res.render('contact', { whatsappNumber: product ? product.whatsapp_number : '' });
});


// ============================================================
// REFERRAL /:username — MUST be last catch-all style route
// ============================================================
router.get('/:username', (req, res) => {
  try {
    // Skip known routes (avoid matching static assets, admin, etc.)
    const reserved = ['admin', 'api', 'login', 'logout', 'account', 'cart', 'thankyou', 'returns', 'payment-delivery', 'contact', 'product', 'p', 'category', 'feedback', 'favicon.ico'];
    if (reserved.includes(req.params.username)) {
      return res.status(404).render('404');
    }

    const user = db.prepare('SELECT * FROM users WHERE referral_code = ? AND is_active = 1').get(req.params.username);
    if (!user) {
      // Also check by username
      const userByName = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(req.params.username);
      if (userByName) {
        req.session.referral_code = userByName.referral_code;
        return res.redirect('/');
      }
      return res.status(404).render('404');
    }

    // Store referral code in session
    req.session.referral_code = user.referral_code;

    // Redirect to home
    res.redirect('/');
  } catch (err) {
    console.error('Referral route error:', err);
    res.status(404).render('404');
  }
});


module.exports = router;
