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

// Initialize and seed
async function initDatabase() {
  await db.init();

  // Enable foreign keys
  sqlDb.run('PRAGMA foreign_keys = ON');

  // Create tables
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

  // Seed default admin if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin created: admin / admin123');
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

    // Add some seed reviews (approved)
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
