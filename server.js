const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------
const sign = (user) =>
  jwt.sign({ id: user.id, name: user.name }, SECRET, { expiresIn: "7d" });

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  try {
    req.user = jwt.verify(header.replace("Bearer ", ""), SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please log in to continue." });
  }
}

// ---------- auth ----------
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required." });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (name, email, password) VALUES (?,?,?)")
      .run(name.trim(), email.trim().toLowerCase(), hash);
    const user = { id: info.lastInsertRowid, name: name.trim() };
    res.json({ token: sign(user), user });
  } catch {
    res.status(409).json({ error: "This email is already registered." });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get((email || "").trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.password))
    return res.status(401).json({ error: "Wrong email or password." });
  res.json({ token: sign(user), user: { id: user.id, name: user.name } });
});

// ---------- products ----------
app.get("/api/categories", (_req, res) => {
  res.json(db.prepare("SELECT DISTINCT category FROM products ORDER BY category").all().map((r) => r.category));
});

app.get("/api/products", (req, res) => {
  const { q = "", category = "" } = req.query;
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (q) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY id";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/products/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json(product);
});

// Cart page sends product ids, gets back full product info
app.post("/api/cart/details", (req, res) => {
  const ids = (req.body.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.json([]);
  const marks = ids.map(() => "?").join(",");
  res.json(db.prepare(`SELECT * FROM products WHERE id IN (${marks})`).all(...ids));
});

// ---------- orders ----------
// body: { items: [{ id, qty }], address, phone }
app.post("/api/orders", auth, (req, res) => {
  const { items, address, phone } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Your cart is empty." });
  if (!address || !phone)
    return res.status(400).json({ error: "Delivery address and phone are required." });

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  const reduceStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
  const insertOrder = db.prepare(
    "INSERT INTO orders (user_id, total, address, phone) VALUES (?,?,?,?)"
  );
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?,?,?,?)"
  );

  try {
    const placeOrder = db.transaction(() => {
      let total = 0;
      const rows = items.map((i) => {
        const qty = Math.max(1, parseInt(i.qty, 10) || 1);
        const p = getProduct.get(i.id);
        if (!p) throw new Error("A product in your cart no longer exists.");
        if (p.stock < qty) throw new Error(`Only ${p.stock} left of "${p.name}".`);
        total += p.price * qty;
        return { id: p.id, qty, price: p.price };
      });
      const order = insertOrder.run(req.user.id, total, address.trim(), phone.trim());
      rows.forEach((r) => {
        insertItem.run(order.lastInsertRowid, r.id, r.qty, r.price);
        reduceStock.run(r.qty, r.id);
      });
      return { orderId: order.lastInsertRowid, total };
    });
    res.json(placeOrder());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders", auth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC")
    .all(req.user.id);
  const itemsStmt = db.prepare(`
    SELECT oi.qty, oi.price, p.name, p.emoji
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?`);
  res.json(orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) })));
});

app.listen(PORT, () => console.log(`Store running at http://localhost:${PORT}`));
