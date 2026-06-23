const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Get all categories
router.get('/categories', async (req, res) => {
  const db = await getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(categories);
});

// Create category
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '鍒嗙被鍚嶇О涓嶈兘涓虹┖' });
  }
  const db = await getDb();
  try {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM categories').get();
    const result = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name.trim(), maxOrder.next);
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim() });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(400).json({ error: '璇ュ垎绫诲凡瀛樺湪' });
    } else {
      res.status(500).json({ error: '鍒涘缓鍒嗙被澶辫触' });
    }
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  const db = await getDb();
  const items = db.prepare('SELECT COUNT(*) as cnt FROM menu_items WHERE category_id = ?').get(req.params.id);
  if (items.cnt > 0) {
    return res.status(400).json({ error: '璇ュ垎绫讳笅杩樻湁鑿滃搧锛岃鍏堝垹闄ゆ垨绉诲姩鑿滃搧' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get all menu items
router.get('/items', async (req, res) => {
  const db = await getDb();
  const items = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    ORDER BY c.sort_order, m.sort_order, m.name
  `).all();
  res.json(items);
});

// Get menu items by category (grouped)
router.get('/items/by-category', async (req, res) => {
  const db = await getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const items = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.available = 1
    ORDER BY c.sort_order, m.sort_order, m.name
  `).all();

  const result = categories.map(cat => ({
    ...cat,
    items: items.filter(item => item.category_id === cat.id)
  }));
  res.json(result.filter(c => c.items.length > 0));
});

// Get single menu item
router.get('/items/:id', async (req, res) => {
  const db = await getDb();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '鑿滃搧涓嶅瓨鍦? });
  res.json(item);
});

// Create menu item
router.post('/items', async (req, res) => {
  const { name, price, description, image, category_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '鑿滃搧鍚嶇О涓嶈兘涓虹┖' });
  }
  if (price === undefined || price < 0) {
    return res.status(400).json({ error: '璇疯緭鍏ユ湁鏁堜环鏍? });
  }
  const db = await getDb();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM menu_items').get();
  const result = db.prepare(`
    INSERT INTO menu_items (name, price, description, image, category_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), parseFloat(price), description || '', image || '', category_id || null, maxOrder.next);

  const newItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newItem);
});

// Update menu item
router.put('/items/:id', async (req, res) => {
  const { name, price, description, image, category_id, available } = req.body;
  const db = await getDb();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '鑿滃搧涓嶅瓨鍦? });

  db.prepare(`
    UPDATE menu_items SET
      name = ?, price = ?, description = ?, image = ?,
      category_id = ?, available = ?
    WHERE id = ?
  `).run(
    name || item.name,
    price !== undefined ? parseFloat(price) : item.price,
    description !== undefined ? description : item.description,
    image !== undefined ? image : item.image,
    category_id !== undefined ? category_id : item.category_id,
    available !== undefined ? (available ? 1 : 0) : item.available,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete menu item
router.delete('/items/:id', async (req, res) => {
  const db = await getDb();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '鑿滃搧涓嶅瓨鍦? });

  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

