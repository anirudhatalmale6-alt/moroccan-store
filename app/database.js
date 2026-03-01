const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'store.db');

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// Synchronous-like wrapper around sql.js
let sqlDb = null;
let ready = false;

function saveToFile() {
  if (sqlDb) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Wrapper that mimics better-sqlite3 API
const db = {
  _initPromise: null,

  async init() {
    if (ready) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      const SQL = await initSqlJs();
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(fileBuffer);
      } else {
        sqlDb = new SQL.Database();
      }
      ready = true;
    })();
    return this._initPromise;
  },

  exec(sql) {
    sqlDb.run(sql);
    saveToFile();
  },

  prepare(sql) {
    return {
      get(...params) {
        const stmt = sqlDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = sqlDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      },
      run(...params) {
        sqlDb.run(sql, params);
        saveToFile();
        return { changes: sqlDb.getRowsModified(), lastInsertRowid: getLastId() };
      }
    };
  }
};

function getLastId() {
  const stmt = sqlDb.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const id = stmt.get()[0];
  stmt.free();
  return id;
}

// Helper to add columns safely
function addColumnIfNotExists(table, colName, colSql) {
  const info = sqlDb.exec(`PRAGMA table_info(${table})`);
  const cols = info.length > 0 ? info[0].values.map(row => row[1]) : [];
  if (!cols.includes(colName)) {
    try { sqlDb.run(colSql); saveToFile(); console.log(`Added column ${table}.${colName}`); } catch(e) { /* exists */ }
  }
}

// Initialize and seed
async function initDatabase() {
  await db.init();

  // Enable foreign keys
  sqlDb.run('PRAGMA foreign_keys = ON');

  // ====== CORE TABLES ======
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 200,
      old_price REAL DEFAULT 0,
      discount TEXT DEFAULT '',
      video_filename TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      deposit_amount REAL DEFAULT 50,
      features TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      main_image TEXT DEFAULT '',
      show_gallery INTEGER DEFAULT 1,
      description_images TEXT DEFAULT '[]',
      whatsapp_number TEXT DEFAULT '',
      delivery_fee REAL DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      order_ref TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      delivery_option TEXT DEFAULT 'deposit',
      payment_amount REAL NOT NULL,
      remaining_amount REAL DEFAULT 0,
      receipt_filename TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      rating INTEGER DEFAULT 5,
      message TEXT NOT NULL,
      image_filename TEXT DEFAULT '',
      audio_filename TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // ====== NEW TABLES ======
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT DEFAULT '',
      image_filename TEXT DEFAULT '',
      price_adjustment REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      variation_size_id INTEGER DEFAULT NULL,
      variation_color_id INTEGER DEFAULT NULL,
      quantity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gift_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_filename TEXT DEFAULT '',
      min_order_amount REAL DEFAULT 0,
      min_quantity INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_transfer_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL DEFAULT '',
      account_holder TEXT NOT NULL DEFAULT '',
      rib TEXT NOT NULL DEFAULT '',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS landing_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      product_id INTEGER DEFAULT NULL,
      payment_type TEXT DEFAULT 'bank',
      is_published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS landing_page_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landing_page_id INTEGER NOT NULL,
      section_type TEXT NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      media_filename TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS home_sliders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      image_filename TEXT NOT NULL,
      link_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      commission_rate REAL DEFAULT 10,
      total_earned REAL DEFAULT 0,
      total_withdrawn REAL DEFAULT 0,
      available_balance REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      order_amount REAL NOT NULL,
      commission_rate REAL NOT NULL,
      commission_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      rib TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      holder_name TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      processed_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ====== MIGRATIONS: Add columns to existing tables ======

  // Products table
  addColumnIfNotExists('products', 'main_image', "ALTER TABLE products ADD COLUMN main_image TEXT DEFAULT ''");
  addColumnIfNotExists('products', 'show_gallery', "ALTER TABLE products ADD COLUMN show_gallery INTEGER DEFAULT 1");
  addColumnIfNotExists('products', 'description_images', "ALTER TABLE products ADD COLUMN description_images TEXT DEFAULT '[]'");
  addColumnIfNotExists('products', 'whatsapp_number', "ALTER TABLE products ADD COLUMN whatsapp_number TEXT DEFAULT ''");
  addColumnIfNotExists('products', 'delivery_fee', "ALTER TABLE products ADD COLUMN delivery_fee REAL DEFAULT 50");
  addColumnIfNotExists('products', 'weight', "ALTER TABLE products ADD COLUMN weight REAL DEFAULT 0");
  addColumnIfNotExists('products', 'audio_filename', "ALTER TABLE products ADD COLUMN audio_filename TEXT DEFAULT ''");
  addColumnIfNotExists('products', 'audio_autoplay', "ALTER TABLE products ADD COLUMN audio_autoplay INTEGER DEFAULT 0");
  addColumnIfNotExists('products', 'cod_enabled', "ALTER TABLE products ADD COLUMN cod_enabled INTEGER DEFAULT 0");
  addColumnIfNotExists('products', 'bank_full_enabled', "ALTER TABLE products ADD COLUMN bank_full_enabled INTEGER DEFAULT 1");
  addColumnIfNotExists('products', 'bank_deposit_enabled', "ALTER TABLE products ADD COLUMN bank_deposit_enabled INTEGER DEFAULT 1");

  // Orders table
  addColumnIfNotExists('orders', 'user_id', "ALTER TABLE orders ADD COLUMN user_id INTEGER DEFAULT NULL");
  addColumnIfNotExists('orders', 'referral_code', "ALTER TABLE orders ADD COLUMN referral_code TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'variation_info', "ALTER TABLE orders ADD COLUMN variation_info TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'payment_type', "ALTER TABLE orders ADD COLUMN payment_type TEXT DEFAULT 'bank_full'");
  addColumnIfNotExists('orders', 'gift_info', "ALTER TABLE orders ADD COLUMN gift_info TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'address', "ALTER TABLE orders ADD COLUMN address TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'city', "ALTER TABLE orders ADD COLUMN city TEXT DEFAULT ''");

  // Admins table
  addColumnIfNotExists('admins', 'email', "ALTER TABLE admins ADD COLUMN email TEXT DEFAULT ''");

  // ====== SEED DATA ======

  // Seed default admin
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin created: admin / admin123');
  }

  // Seed bank transfer settings from hardcoded values
  const bankCount = db.prepare('SELECT COUNT(*) as count FROM bank_transfer_settings').get();
  if (bankCount.count === 0) {
    db.prepare('INSERT INTO bank_transfer_settings (bank_name, account_holder, rib, is_active) VALUES (?, ?, ?, ?)').run('CIH Bank', 'متجرنا SARL', '230 780 0118274000 68 30', 1);
    console.log('Default bank transfer settings seeded');
  }

  // Seed admin settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM admin_settings').get();
  if (settingsCount.count === 0) {
    const defaults = [
      ['site_name', 'متجرنا'],
      ['min_withdrawal_orders', '20'],
      ['default_commission_rate', '10'],
    ];
    defaults.forEach(([key, value]) => {
      db.prepare('INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)').run(key, value);
    });
    console.log('Default admin settings seeded');
  }

  // Font settings
  if (!db.prepare("SELECT 1 FROM admin_settings WHERE setting_key = 'font_family'").get()) {
    db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)").run('font_family', 'Cairo');
  }
  if (!db.prepare("SELECT 1 FROM admin_settings WHERE setting_key = 'custom_font_url'").get()) {
    db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)").run('custom_font_url', '');
  }

  // Seed a default product if none exists
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    db.prepare(`
      INSERT INTO products (title, description, price, old_price, discount, slug, deposit_amount, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'منتج طبيعي عالي الجودة',
      'منتج طبيعي 100% بمكونات عضوية مختارة بعناية. نتائج مضمونة من أول استعمال مع توصيل سريع لجميع مدن المغرب.',
      200, 350, '- 43%', 'natural-product', 50,
      JSON.stringify([
        { icon: '🌿', title: 'طبيعي 100%', desc: 'مكونات طبيعية عضوية بدون أي مواد كيميائية ضارة. آمن تماماً للبشرة الحساسة.' },
        { icon: '⚡', title: 'نتائج سريعة', desc: 'ستلاحظ الفرق من الاستعمال الأول. نتائج مثبتة علمياً ومضمونة.' },
        { icon: '🚚', title: 'توصيل سريع', desc: 'توصيل لجميع مدن المغرب في أقل من 48 ساعة. الدفع عند الاستلام متاح.' }
      ])
    );

    const product = db.prepare('SELECT id FROM products WHERE slug = ?').get('natural-product');
    if (product) {
      const seedReviews = [
        { name: 'فاطمة', rating: 5, message: 'منتج ممتاز! النتائج بانت من أول أسبوع. التوصيل كان سريع جداً. شكراً لكم على هذا المنتج الرائع.' },
        { name: 'سميرة', rating: 5, message: 'ما كنتش متأكدة ولكن جربت وفعلاً النتائج مذهلة! كنصح بيه لأي واحد. الثمن مناسب بزاف.' },
        { name: 'رشيد', rating: 5, message: 'خديت 2 وحدات والنتيجة فوق المتوقع. المنتج فعلاً طبيعي ولا يسبب أي حساسية. أنصح به بقوة.' },
        { name: 'مريم', rating: 5, message: 'منتج طبيعي بزاف وفعال. أنا كنستعملو من شهر ونتائج واضحة. التوصيل كان في الوقت وبالثمن المعقول.' },
        { name: 'أحمد', rating: 4, message: 'منتج جيد والنتائج مرضية. التغليف كان ممتاز والتوصيل سريع. غادي نعاود نطلب إن شاء الله.' },
        { name: 'نادية', rating: 5, message: 'هذا أحسن منتج استعملته! النتائج كانت سريعة وطبيعية. شكراً لكم على الجودة العالية.' }
      ];
      seedReviews.forEach(r => {
        db.prepare('INSERT INTO reviews (product_id, name, rating, message, status) VALUES (?, ?, ?, ?, ?)').run(product.id, r.name, r.rating, r.message, 'approved');
      });
    }
    console.log('Default product and reviews seeded');
  }

  return db;
}

module.exports = { db, initDatabase };
