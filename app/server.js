const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./database');
const { getTranslator, getDirection } = require('./i18n');

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

    // Load ALL settings at once
    const allSettings = {};
    db.prepare('SELECT setting_key, setting_value FROM admin_settings').all().forEach(r => { allSettings[r.setting_key] = r.setting_value; });

    // Theme colors
    res.locals.primaryColor = allSettings.primary_color || '#000000';
    res.locals.secondaryColor = allSettings.secondary_color || '#333333';
    res.locals.buttonColor = allSettings.button_color || '#000000';
    res.locals.buttonTextColor = allSettings.button_text_color || '#FFFFFF';
    res.locals.textColor = allSettings.text_color || '#2C1810';
    res.locals.bgColor = allSettings.bg_color || '#FFFFFF';
    res.locals.headerBgColor = allSettings.header_bg_color || '#FFFFFF';
    res.locals.headerTextColor = allSettings.header_text_color || '#000000';
    res.locals.footerBgColor = allSettings.footer_bg_color || '#1a1a1a';
    res.locals.footerTextColor = allSettings.footer_text_color || '#FFFFFF';
    res.locals.metaTitle = allSettings.meta_title || '';
    res.locals.metaDescription = allSettings.meta_description || '';
    res.locals.ogImage = allSettings.og_image || '';
    res.locals.favicon = allSettings.favicon || '';
    res.locals.gaId = allSettings.ga_id || '';
    res.locals.fbPixelId = allSettings.fb_pixel_id || '';
    res.locals.tiktokPixelId = allSettings.tiktok_pixel_id || '';
    res.locals.customMetaTags = allSettings.custom_meta_tags || '';
    res.locals.desktopLogo = allSettings.desktop_logo || '';
    res.locals.mobileLogo = allSettings.mobile_logo || '';

    // Language / i18n
    const siteLang = allSettings.site_language || 'ar';
    res.locals.siteLang = siteLang;
    // For 'both' mode, determine active language from query or session
    let activeLang = siteLang;
    if (siteLang === 'both') {
      if (req.query.lang === 'ar' || req.query.lang === 'fr') {
        req.session.lang = req.query.lang;
        activeLang = req.query.lang;
      } else if (req.session.lang) {
        activeLang = req.session.lang;
      } else {
        activeLang = 'ar'; // default to Arabic in both mode
      }
    }
    res.locals.lang = activeLang;
    res.locals.dir = getDirection(activeLang);
    res.locals.t = getTranslator(activeLang);

    // Cart mode
    res.locals.cartMode = allSettings.cart_mode || 'drawer';

    // Checkout description
    res.locals.checkoutDescription = allSettings.checkout_description || '';
  } catch(e) {
    res.locals.siteName = 'متجرنا';
    res.locals.fontFamily = 'Cairo';
    res.locals.customFontUrl = '';
    res.locals.primaryColor = '#000000';
    res.locals.secondaryColor = '#333333';
    res.locals.buttonColor = '#000000';
    res.locals.buttonTextColor = '#FFFFFF';
    res.locals.textColor = '#2C1810';
    res.locals.bgColor = '#FFFFFF';
    res.locals.headerBgColor = '#FFFFFF';
    res.locals.headerTextColor = '#000000';
    res.locals.footerBgColor = '#1a1a1a';
    res.locals.footerTextColor = '#FFFFFF';
    res.locals.metaTitle = '';
    res.locals.metaDescription = '';
    res.locals.ogImage = '';
    res.locals.favicon = '';
    res.locals.gaId = '';
    res.locals.fbPixelId = '';
    res.locals.tiktokPixelId = '';
    res.locals.customMetaTags = '';
    res.locals.desktopLogo = '';
    res.locals.mobileLogo = '';
    res.locals.lang = 'ar';
    res.locals.dir = 'rtl';
    res.locals.siteLang = 'ar';
    res.locals.t = getTranslator('ar');
    res.locals.cartMode = 'drawer';
    res.locals.checkoutDescription = '';
  }

  // Cart count for badge
  try {
    const { db } = require('./database');
    const countRow = db.prepare('SELECT SUM(quantity) as total FROM cart_items WHERE session_id = ?').get(req.sessionID);
    res.locals.cartCount = countRow && countRow.total ? countRow.total : 0;
  } catch(e) {
    res.locals.cartCount = 0;
  }

  // Global categories for sidebar menu
  try {
    const { db } = require('./database');
    res.locals.sidebarCategories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all();
  } catch(e) {
    res.locals.sidebarCategories = [];
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
