const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');
const { getDb } = require('./db');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/gif/webp 格式'));
    }
  }
});

// Socket.IO - real-time communication
io.on('connection', (socket) => {
  console.log(`用户已连接: ${socket.id}`);
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`${socket.id} 加入了 ${room}`);
  });
  // Broadcast new order to other connected clients
  socket.on('new_order', (order) => {
    socket.broadcast.emit('new_order', order);
  });
  // Broadcast order status update to other connected clients
  socket.on('order_updated', (order) => {
    socket.broadcast.emit('order_updated', order);
  });
  socket.on('disconnect', () => {
    console.log(`用户已断开: ${socket.id}`);
  });
});

app.set('io', io);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Image upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// Error handling for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '图片大小不能超过 5MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
async function start() {
  await getDb();
  server.listen(PORT, '0.0.0.0', () => {
    console.log('点菜系统已启动 http://0.0.0.0:' + PORT);
    console.log('数据库已初始化');
  });
}
start();
