// ===== Auth + API helper =====
const store = {
  get token() { return localStorage.getItem("token"); },
  get user() { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } },
  login(data) { localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user)); },
  logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); location.href = "/"; },
};

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(store.token ? { Authorization: "Bearer " + store.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && store.token) store.logout();
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

// ===== Cart (saved in the browser: [{ id, qty }]) =====
const cart = {
  get items() { try { return JSON.parse(localStorage.getItem("cart")) || []; } catch { return []; } },
  save(items) { localStorage.setItem("cart", JSON.stringify(items)); renderHeader(); },
  count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  add(id, qty = 1) {
    const items = this.items;
    const found = items.find((i) => i.id === id);
    found ? (found.qty += qty) : items.push({ id, qty });
    this.save(items);
  },
  setQty(id, qty) {
    this.save(this.items.map((i) => (i.id === id ? { ...i, qty } : i)).filter((i) => i.qty > 0));
  },
  remove(id) { this.save(this.items.filter((i) => i.id !== id)); },
  clear() { this.save([]); },
};

// ===== UI helpers =====
const $ = (sel) => document.querySelector(sel);
const money = (n) => "৳" + Number(n).toLocaleString("en-US");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(text) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

function renderHeader() {
  const el = $("#site-header");
  if (!el) return;
  const user = store.user;
  el.innerHTML = `
    <div class="wrap">
      <a class="brand" href="/">Hat<span>.</span></a>
      <nav class="nav">
        <a href="/">Shop</a>
        ${user ? `<a href="/orders.html">My orders</a><button id="logout">Log out (${esc(user.name.split(" ")[0])})</button>`
               : `<a href="/login.html">Log in</a>`}
        <a class="cart-link" href="/cart.html">Cart (${cart.count()})</a>
      </nav>
    </div>`;
  const lo = $("#logout");
  if (lo) lo.onclick = () => store.logout();
}
document.addEventListener("DOMContentLoaded", renderHeader);
