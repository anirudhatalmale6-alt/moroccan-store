const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get product info (for checkout dynamic pricing)
router.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT id, title, price, deposit_amount, slug FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

module.exports = router;
