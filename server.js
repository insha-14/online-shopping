const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY product_id DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Could not load products." }); }
});

app.post("/api/products", async (req, res) => {
  const { product_name, category, price, stock, description } = req.body;
  if (!product_name || !category || Number(price) < 0 || Number(stock) < 0)
    return res.status(400).json({ message: "Enter valid product details." });
  try {
    const [result] = await db.query(
      "INSERT INTO products (product_name, category, price, stock, description) VALUES (?, ?, ?, ?, ?)",
      [product_name, category, price, stock, description || ""]
    );
    res.status(201).json({ message: "Product added.", product_id: result.insertId });
  } catch (err) { res.status(500).json({ message: "Could not add product." }); }
});

app.put("/api/products/:id", async (req, res) => {
  const { product_name, category, price, stock, description } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE products SET product_name=?, category=?, price=?, stock=?, description=? WHERE product_id=?",
      [product_name, category, price, stock, description || "", req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product updated." });
  } catch (err) { res.status(500).json({ message: "Could not update product." }); }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM products WHERE product_id=?", [req.params.id]);
    res.json({ message: "Product deleted." });
  } catch (err) { res.status(500).json({ message: "Could not delete product. It may be in an order." }); }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'customer')",
      [name, email, hash, phone || null]
    );
    res.status(201).json({ user_id: result.insertId, name, email });
  } catch (err) { res.status(400).json({ message: "Email may already be registered." }); }
});

app.post("/api/cart", async (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  if (!user_id || !product_id || !Number.isInteger(Number(quantity)) || Number(quantity) < 1)
    return res.status(400).json({ message: "Invalid cart details." });
  try {
    const [[product]] = await db.query("SELECT stock FROM products WHERE product_id=?", [product_id]);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (product.stock < quantity) return res.status(400).json({ message: "Not enough stock available." });
    await db.query(
      `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [user_id, product_id, quantity]
    );
    res.json({ message: "Added to cart." });
  } catch (err) { res.status(500).json({ message: "Could not add item to cart." }); }
});

app.get("/api/cart/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.cart_id, c.product_id, c.quantity, p.product_name, p.price, p.stock,
       (c.quantity * p.price) AS subtotal
       FROM cart c JOIN products p ON c.product_id=p.product_id WHERE c.user_id=?`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Could not load cart." }); }
});

app.put("/api/cart/:cartId", async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1." });
  try {
    const [[row]] = await db.query(
      "SELECT c.product_id, p.stock FROM cart c JOIN products p ON c.product_id=p.product_id WHERE c.cart_id=?",
      [req.params.cartId]
    );
    if (!row) return res.status(404).json({ message: "Cart item not found." });
    if (quantity > row.stock) return res.status(400).json({ message: "Quantity exceeds available stock." });
    await db.query("UPDATE cart SET quantity=? WHERE cart_id=?", [quantity, req.params.cartId]);
    res.json({ message: "Cart updated." });
  } catch (err) { res.status(500).json({ message: "Could not update cart." }); }
});

app.delete("/api/cart/:cartId", async (req, res) => {
  try {
    await db.query("DELETE FROM cart WHERE cart_id=?", [req.params.cartId]);
    res.json({ message: "Item removed." });
  } catch (err) { res.status(500).json({ message: "Could not remove item." }); }
});

app.post("/api/orders", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: "User ID is required." });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query(
      `SELECT c.cart_id, c.product_id, c.quantity, p.price, p.stock
       FROM cart c JOIN products p ON c.product_id=p.product_id
       WHERE c.user_id=? FOR UPDATE`, [user_id]
    );
    if (!items.length) throw new Error("Your cart is empty.");
    for (const item of items) {
      if (item.quantity > item.stock) throw new Error("An item no longer has enough stock.");
    }
    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const [order] = await conn.query(
      "INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, 'Placed')", [user_id, total]
    );
    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [order.insertId, item.product_id, item.quantity, item.price]
      );
      await conn.query("UPDATE products SET stock=stock-? WHERE product_id=?", [item.quantity, item.product_id]);
    }
    await conn.query("DELETE FROM cart WHERE user_id=?", [user_id]);
    await conn.commit();
    res.status(201).json({ message: "Order placed successfully!", order_id: order.insertId, total });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message || "Could not place order." });
  } finally { conn.release(); }
});

app.get("/api/orders/:userId", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM orders WHERE user_id=? ORDER BY order_date DESC", [req.params.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Could not load orders." }); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shopping Cart running at http://localhost:${PORT}`));
