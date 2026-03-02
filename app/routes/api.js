const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get product info (for checkout dynamic pricing)
router.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT id, title, price, deposit_amount, slug FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

// Update cart item quantity via AJAX (delta-based: +1 or -1)
router.post('/cart/update-qty', (req, res) => {
  const { itemId, delta } = req.body;
  const sessionId = req.sessionID;
  try {
    const item = db.prepare(`
      SELECT ci.*, p.price, p.title
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ? AND ci.session_id = ?
    `).get(itemId, sessionId);
    if (!item) return res.json({ success: false });

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(itemId, sessionId);
      const countRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM cart_items WHERE session_id = ?').get(sessionId);
      const totalRow = db.prepare(`
        SELECT COALESCE(SUM(
          (p.price + COALESCE(sv.price_adjustment, 0) + COALESCE(cv.price_adjustment, 0)) * ci.quantity
        ), 0) as total
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variations sv ON ci.variation_size_id = sv.id
        LEFT JOIN product_variations cv ON ci.variation_color_id = cv.id
        WHERE ci.session_id = ?
      `).get(sessionId);
      return res.json({ success: true, removed: true, cartCount: countRow.total, cartTotal: totalRow.total });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?').run(newQty, itemId, sessionId);

    // Calculate unit price with variations
    let unitPrice = item.price;
    if (item.variation_size_id) {
      const sv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(item.variation_size_id);
      if (sv) unitPrice += sv.price_adjustment;
    }
    if (item.variation_color_id) {
      const cv = db.prepare('SELECT price_adjustment FROM product_variations WHERE id = ?').get(item.variation_color_id);
      if (cv) unitPrice += cv.price_adjustment;
    }
    const itemTotal = unitPrice * newQty;

    const countRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM cart_items WHERE session_id = ?').get(sessionId);
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(
        (p.price + COALESCE(sv.price_adjustment, 0) + COALESCE(cv.price_adjustment, 0)) * ci.quantity
      ), 0) as total
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variations sv ON ci.variation_size_id = sv.id
      LEFT JOIN product_variations cv ON ci.variation_color_id = cv.id
      WHERE ci.session_id = ?
    `).get(sessionId);

    res.json({ success: true, newQty, itemTotal, cartCount: countRow.total, cartTotal: totalRow.total });
  } catch (e) {
    console.error('Cart update-qty error:', e);
    res.json({ success: false });
  }
});

module.exports = router;
