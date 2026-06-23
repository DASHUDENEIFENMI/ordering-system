const API = {
  base: '',

  async get(path) {
    const r = await fetch(this.base + path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async post(path, data) {
    const r = await fetch(this.base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error((await r.json()).error || '请求失败');
    return r.json();
  },

  async put(path, data) {
    const r = await fetch(this.base + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error((await r.json()).error || '请求失败');
    return r.json();
  },

  async patch(path, data) {
    const r = await fetch(this.base + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error((await r.json()).error || '请求失败');
    return r.json();
  },

  async del(path) {
    const r = await fetch(this.base + path, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || '请求失败');
    return r.json();
  },

  async uploadImage(file) {
    const form = new FormData();
    form.append('image', file);
    const r = await fetch(this.base + '/api/upload', { method: 'POST', body: form });
    if (!r.ok) throw new Error((await r.json()).error || '上传失败');
    return r.json();
  },

  // Menu
  getMenuByCategory() { return this.get('/api/menu/items/by-category'); },
  getAllItems() { return this.get('/api/menu/items'); },
  getItem(id) { return this.get('/api/menu/items/' + id); },
  createItem(data) { return this.post('/api/menu/items', data); },
  updateItem(id, data) { return this.put('/api/menu/items/' + id, data); },
  deleteItem(id) { return this.del('/api/menu/items/' + id); },
  getCategories() { return this.get('/api/menu/categories'); },
  createCategory(name) { return this.post('/api/menu/categories', { name }); },
  deleteCategory(id) { return this.del('/api/menu/categories/' + id); },

  // Orders
  getOrders(status) {
    const query = status ? '?status=' + status : '';
    return this.get('/api/orders' + query);
  },
  getOrder(id) { return this.get('/api/orders/' + id); },
  createOrder(data) { return this.post('/api/orders', data); },
  updateOrderStatus(id, status) { return this.patch('/api/orders/' + id + '/status', { status }); }
};
