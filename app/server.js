const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: 'moroccan-store-secret-2024-xyz',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Make session available in templates
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  res.locals.user = req.session.user || null;

  // Site name from admin_settings
  try {
    const { db } = require('./database');
    const siteNameRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'site_name'").get();
    res.locals.siteName = siteNameRow ? siteNameRow.setting_value : 'متجرنا';

    // Font settings
    const fontRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'font_family'").get();
    res.locals.fontFamily = fontRow ? fontRow.setting_value : 'Cairo';
    const fontUrlRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'custom_font_url'").get();
    res.locals.customFontUrl = fontUrlRow ? fontUrlRow.setting_value : '';

    const colorRow = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'primary_color'").get();
    res.locals.primaryColor = colorRow ? colorRow.setting_value : '#8B6F47';

    // SEO & Social settings
    const allSettings = {};
    db.prepare('SELECT setting_key, setting_value FROM admin_settings').all().forEach(r => { allSettings[r.setting_key] = r.setting_value; });
    res.locals.metaTitle = allSettings.meta_title || '';
    res.locals.metaDescription = allSettings.meta_description || '';
    res.locals.ogImage = allSettings.og_image || '';
    res.locals.favicon = allSettings.favicon || '';
    res.locals.gaId = allSettings.ga_id || '';
    res.locals.fbPixelId = allSettings.fb_pixel_id || '';
    res.locals.tiktokPixelId = allSettings.tiktok_pixel_id || '';
    res.locals.customMetaTags = allSettings.custom_meta_tags || '';
  } catch(e) {
    res.locals.siteName = 'متجرنا';
    res.locals.fontFamily = 'Cairo';
    res.locals.customFontUrl = '';
    res.locals.primaryColor = '#8B6F47';
    res.locals.metaTitle = '';
    res.locals.metaDescription = '';
    res.locals.ogImage = '';
    res.locals.favicon = '';
    res.locals.gaId = '';
    res.locals.fbPixelId = '';
    res.locals.tiktokPixelId = '';
    res.locals.customMetaTags = '';
  }

  // Cart count for badge
  try {
    const { db } = require('./database');
    const countRow = db.prepare('SELECT SUM(quantity) as total FROM cart_items WHERE session_id = ?').get(req.sessionID);
    res.locals.cartCount = countRow && countRow.total ? countRow.total : 0;
  } catch(e) {
    res.locals.cartCount = 0;
  }

  next();
});

// Routes (admin must be before public due to /:username catch-all)
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/public'));

// 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Initialize database then start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
