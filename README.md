# 点菜系统 🍽️

一个基于飞牛 OS 中转的餐厅点菜系统，支持两部手机协同：
- **手机 A** — 浏览菜单、选菜加备注、下单
- **手机 B** — 实时接收订单通知、管理订单状态

## 功能特性

- 📱 **移动端优先** — PWA 支持，可添加到手机桌面，体验接近原生小程序
- 🔄 **实时通知** — 下单后另一台手机即时收到推送
- 🖼 **菜品图片** — 支持上传菜品图片
- 📝 **备注功能** — 每道菜可单独备注口味要求，订单可加整体备注
- 🛒 **购物车** — 选菜、改数量、查看汇总
- ⚙ **菜单管理** — 添加/编辑/删除菜品、分类管理、上架/停售
- 📋 **订单管理** — 实时订单列表、状态流转（待处理→准备中→已上菜→已完成）
- 🐳 **Docker 部署** — 一键部署到飞牛 OS

## 项目结构

```
点菜系统/
├── backend/           # 后端服务
│   ├── server.js      # Express + Socket.IO 主服务
│   ├── db.js          # SQLite 数据库
│   ├── routes/        # API 路由
│   │   ├── menu.js    # 菜单 CRUD
│   │   └── orders.js  # 订单管理
│   ├── uploads/       # 菜品图片存储
│   └── Dockerfile     # Docker 构建文件
├── frontend/          # 前端 SPA
│   ├── index.html     # 主页面
│   ├── css/style.css  # 移动端样式
│   ├── js/            # 前端逻辑
│   ├── icons/         # PWA 图标
│   ├── manifest.json  # PWA 配置
│   └── sw.js          # Service Worker
├── docker-compose.yml # Docker 编排
└── README.md
```

## 在飞牛 OS 上部署

### 方法一：Docker Compose（推荐）

1. **将项目上传到飞牛 OS** — 通过飞牛 OS 的 SMB/WebDAV 或 SSH 将整个项目目录复制到 NAS 上

2. **SSH 进入飞牛 OS**
   ```bash
   ssh admin@<飞牛OS的IP>
   cd /path/to/点菜系统
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **查看运行状态**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **访问系统** — 浏览器打开 `http://<飞牛OS的IP>:3000`

### 方法二：直接运行（无需 Docker）

在飞牛 OS 上安装 Node.js 后：
```bash
cd 点菜系统/backend
npm install
node server.js
```

## 使用说明

### 基础设置

1. 部署完成后，两部手机打开浏览器访问 `http://<飞牛OS的IP>:3000`
2. 点击左上角菜单 → **管理菜单**，先添加分类和菜品
3. 支持上传菜品图片、填写描述和价格

### 点菜流程（手机 A）

1. 打开系统，浏览分类和菜品
2. 点击「+」按钮将菜品加入购物车
3. 点击菜品下方的输入框可添加每道菜的备注（如：少辣、不放葱）
4. 点击底部「购物车」查看已选菜品
5. 可在购物车中调整数量或填写整体订单备注
6. 点击「提交订单」

### 接收订单（手机 B）

1. 打开系统，切换到「订单」页面
2. 新订单会自动弹出通知
3. 点击订单可查看详情
4. 可操作订单状态：待处理 → 准备中 → 已上菜 → 已完成

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/menu/items/by-category | 按分类获取菜单 |
| GET | /api/menu/items | 获取所有菜品 |
| POST | /api/menu/items | 添加菜品 |
| PUT | /api/menu/items/:id | 更新菜品 |
| DELETE | /api/menu/items/:id | 删除菜品 |
| GET | /api/menu/categories | 获取分类 |
| POST | /api/menu/categories | 添加分类 |
| DELETE | /api/menu/categories/:id | 删除分类 |
| GET | /api/orders | 获取订单列表 |
| POST | /api/orders | 创建订单 |
| PATCH | /api/orders/:id/status | 更新订单状态 |
| POST | /api/upload | 上传图片 |

## 技术栈

- **后端**: Node.js + Express + Socket.IO + SQLite
- **前端**: 原生 JavaScript + CSS3 (PWA)
- **实时通信**: WebSocket (Socket.IO)
- **存储**: SQLite (数据) + 文件系统 (图片)
- **部署**: Docker / Docker Compose

## 注意事项

- 确保飞牛 OS 的网络与两部手机在同一个局域网内（或配置端口转发支持外网访问）
- 图片大小限制为 5MB，支持 jpg、jpeg、png、gif、webp 格式
- 数据存储在 Docker volume 中，重启容器不会丢失
