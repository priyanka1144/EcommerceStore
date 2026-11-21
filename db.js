const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "shop.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Small helper: run a function inside a database transaction
db.transaction = (fn) => (...args) => {
  db.exec("BEGIN");
  try {
    const result = fn(...args);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing',
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL
);
`);

// Seed products only once
if (db.prepare("SELECT COUNT(*) AS c FROM products").get().c === 0) {
  const ins = db.prepare(
    "INSERT INTO products (name, category, price, stock, emoji, color, description) VALUES (?,?,?,?,?,?,?)"
  );
  const items = [
    ["Wireless Headphones", "Electronics", 2490, 25, "🎧", "#dbeafe", "Over-ear Bluetooth headphones with 30-hour battery life and a built-in microphone."],
    ["Smart Watch", "Electronics", 3890, 15, "⌚", "#e0e7ff", "Tracks steps, heart rate and sleep. Water resistant, works with Android and iOS."],
    ["Mechanical Keyboard", "Electronics", 3150, 20, "⌨️", "#ede9fe", "Hot-swappable switches, RGB backlight and a compact 75% layout."],
    ["Power Bank 20000mAh", "Electronics", 1890, 40, "🔋", "#fef3c7", "Fast-charging power bank with two USB ports and one USB-C port."],
    ["Canvas Backpack", "Fashion", 1450, 30, "🎒", "#dcfce7", "Water-resistant 25L backpack with a padded laptop sleeve."],
    ["Running Shoes", "Fashion", 3290, 18, "👟", "#fee2e2", "Lightweight, breathable shoes with a cushioned sole for daily runs."],
    ["Sunglasses", "Fashion", 990, 50, "🕶️", "#fce7f3", "UV400 protection with a polarized lens and a durable frame."],
    ["Ceramic Coffee Mug", "Home", 450, 60, "☕", "#ffedd5", "350ml hand-glazed ceramic mug. Microwave and dishwasher safe."],
    ["Desk Lamp", "Home", 1350, 22, "💡", "#fef9c3", "LED desk lamp with three brightness levels and a USB charging port."],
    ["Notebook Set (3 pcs)", "Stationery", 380, 80, "📓", "#e0f2fe", "A5 ruled notebooks with 120 pages each and a hard cover."],
    ["Gel Pen Pack (10 pcs)", "Stationery", 220, 100, "🖊️", "#f1f5f9", "Smooth-writing 0.5mm gel pens in assorted colors."],
    ["Yoga Mat", "Sports", 1190, 28, "🧘", "#d1fae5", "6mm non-slip mat with a carry strap. Easy to clean."]
  ];
  const tx = db.transaction((rows) => rows.forEach((r) => ins.run(...r)));
  tx(items);
}

module.exports = db;
