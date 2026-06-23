const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

// Generate order number
function generateOrderNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${date}${rand}`;
}

// Get all orders (with items)
router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = '';
  const params = [];
  if (status) {
    where = 'WHERE o.status = ?';
    params.push(status);
  }

  const orders = db.prepare(`
    SELECT o.* FROM orders o
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const orderIds = orders.map(o => o.id);
  let items = [];
  if (orderIds.length > 0) {
    items = db.prepare(`
      SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})
    `).all(...orderIds);
  }

  const itemsByOrder = {};
  for (const item of items) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  const result = orders.map(order => ({
    ...order,
    items: itemsByOrder[order.id] || []
  }));

  res.json(result);
});

// Get single order
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '璁㈠崟涓嶅瓨鍦? });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

// Create order
router.post('/', async (req, res) => {
  const { items, table_no, note } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '璇疯嚦灏戦€夋嫨涓€涓彍鍝? });
  }

  const db = await getDb();
  const orderNo = generateOrderNo();
  let totalPrice = 0;

  const orderItems = items.map(item => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.quantity) || 1;
    totalPrice += price * qty;
    return {
      menu_item_id: item.menu_item_id || null,
      item_name: item.item_name,
      quantity: qty,
      price: price,
      note: item.note || ''
    };
  });

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, table_no, note, total_price, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, price, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const result = insertOrder.run(orderNo, table_no || '', note || '', totalPrice);
    const orderId = result.lastInsertRowid;
    for (const item of orderItems) {
      insertItem.run(orderId, item.menu_item_id, item.item_name, item.quantity, item.price, item.note);
    }
    return orderId;
  });

  const orderId = transaction();
  const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems2 = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  res.status(201).json({ ...newOrder, items: orderItems2 });
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '鏃犳晥鐨勭姸鎬? });
  }

  const db = await getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '璁㈠崟涓嶅瓨鍦? });

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(updated.id);

  res.json({ ...updated, items });
});

module.exports = router;

