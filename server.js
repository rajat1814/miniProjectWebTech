const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const badWords = require('bad-words');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database(':memory:'); // Change to './reviews.db' for persistence

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, image TEXT)`);
  db.run(`CREATE TABLE reviews (
    id INTEGER PRIMARY KEY,
    product_id INTEGER,
    user_name TEXT,
    rating INTEGER,
    comment TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed products
  db.run(`INSERT INTO products (name, image) VALUES 
    ('Wireless Headphones', 'https://picsum.photos/id/20/300/200'),
    ('Smart Watch', 'https://picsum.photos/id/60/300/200'),
    ('Laptop Stand', 'https://picsum.photos/id/201/300/200')
  `);
});

// Profanity Filter
const filter = new badWords();

// Add Review with Moderation
app.post('/api/reviews', (req, res) => {
  const { product_id, user_name, rating, comment } = req.body;

  let status = 'approved';

  // Moderation Logic
  if (filter.isProfane(comment) || comment.length > 500 || comment.length < 10) {
    status = 'pending';
  }
  // Simple spam check
  if ((comment.match(/(.)\1{4,}/g) || []).length > 0) {
    status = 'pending';
  }

  db.run(`INSERT INTO reviews (product_id, user_name, rating, comment, status) 
          VALUES (?, ?, ?, ?, ?)`,
    [product_id, user_name, rating, comment, status],
    function(err) {
      if (err) return res.status(500).json({error: err});
      res.json({ id: this.lastID, status });
    });
});

app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/reviews/:product_id', (req, res) => {
  db.all("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved'", 
    [req.params.product_id], (err, rows) => {
      res.json(rows);
    });
});

app.get('/api/admin/reviews', (req, res) => {
  db.all("SELECT * FROM reviews", [], (err, rows) => {
    res.json(rows);
  });
});

app.put('/api/admin/reviews/:id', (req, res) => {
  const { status } = req.body;
  db.run("UPDATE reviews SET status = ? WHERE id = ?", [status, req.params.id], () => {
    res.json({ success: true });
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));