const state = {
  currentView: 'menu',
  menuData: [],
  categories: [],
  cart: [],
  cartOpen: false,
  currentCategory: null,
  editingDish: null
};
const $ = id => document.getElementById(id);
const title = $('app-title');
const backBtn = $('back-btn');
const menuBtn = $('menu-btn');
const sidebar = $('sidebar');
document.addEventListener('DOMContentLoaded', async () => {
  SOCKET.connect();
  setRefreshOrders(loadOrders);
  menuBtn.addEventListener('click', () => toggleSidebar());
  document.querySelectorAll('.sidebar-menu li').forEach(li => {
    li.addEventListener('click', () => {
      switchView(li.dataset.view);
      closeSidebar();
    });
  });
  backBtn.addEventListener('click', () => {
    if (state.cartOpen) { closeCartView(); return; }
    if (document.querySelector('#view-order-detail.active')) {
      showView('orders');
    }
  });
  $('cart-bar-btn').addEventListener('click', openCartView);
  $('cart-close').addEventListener('click', closeCartView);
  $('submit-order-btn').addEventListener('click', submitOrder);
  $('dish-form').addEventListener('submit', saveDish);
  $('dish-form-cancel').addEventListener('click', closeDishModal);
  document.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', () => el.closest('.modal').classList.remove('show'));
  });
  $('dish-image').addEventListener('change', previewDishImage);
  $('category-form').addEventListener('submit', saveCategory);
  $('category-form-cancel').addEventListener('click', () => $('category-modal').classList.remove('show'));
  $('add-category-btn').addEventListener('click', () => {
    $('category-name').value = '';
    $('category-modal').classList.add('show');
  });
  $('add-dish-btn').addEventListener('click', () => openDishModal(null));
  document.addEventListener('click', (e) => {
    if (e.target.closest('#sidebar')) return;
    if (sidebar.classList.contains('open') && !e.target.closest('#menu-btn')) {
      closeSidebar();
    }
  });
  await loadMenu();
  switchView('menu');
});
function toggleSidebar() { sidebar.classList.toggle('open'); }
function closeSidebar() { sidebar.classList.remove('open'); }
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = $('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll('.sidebar-menu li').forEach(li => {
    li.classList.toggle('active', li.dataset.view === view);
  });
  backBtn.style.display = 'none';
  title.textContent = view === 'menu' ? '点菜系统' : view === 'orders' ? '订单' : '管理菜单';
  if (view === 'orders') loadOrders();
  if (view === 'manage') loadManageView();
  if (state.cartOpen) closeCartView();
  updateCartBar();
}
function showView(view) { switchView(view); }
function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}
async function loadMenu() {
  try {
    state.menuData = await API.getMenuByCategory();
    state.categories = await API.getCategories();
    renderCategoryTabs();
    renderMenu();
  } catch (e) {
    $('menu-items').innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>加载菜单失败</p></div>';
  }
}
function renderCategoryTabs() {
  const container = $('category-tabs');
  if (!state.menuData || state.menuData.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = state.menuData.map((cat, i) =>
    '<div class="category-tab ' + (i === 0 ? 'active' : '') + '" data-cat-id="' + cat.id + '">' + cat.name + '</div>'
  ).join('');
  container.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentCategory = tab.dataset.catId;
      renderMenu();
    });
  });
  if (state.menuData.length > 0) state.currentCategory = state.menuData[0].id;
}
function renderMenu() {
  const container = $('menu-items');
  if (!state.menuData || state.menuData.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🍽</div><p>菜单还是空的，快去添加菜品吧</p></div>';
    return;
  }
  const category = state.menuData.find(c => String(c.id) === String(state.currentCategory));
  if (!category || !category.items || category.items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>该分类暂无菜品</p></div>';
    return;
  }
  container.innerHTML = category.items.map(item => {
    const cartItem = state.cart.find(c => c.menu_item_id === item.id);
    const qty = cartItem ? cartItem.quantity : 0;
    const note = cartItem ? cartItem.note : '';
    const avail = item.available;
    return '<div class="menu-item ' + (!avail ? 'unavailable' : '') + '" data-id="' + item.id + '">' +
      '<div class="menu-item-image">' +
        (item.image ? '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">' : '<span class="no-img">🍜</span>') +
      '</div>' +
      '<div class="menu-item-info">' +
        '<div class="menu-item-name">' + item.name + '</div>' +
        (item.description ? '<div class="menu-item-desc">' + item.description + '</div>' : '') +
        '<div class="menu-item-bottom">' +
          '<div class="menu-item-price">' + item.price.toFixed(2) + '</div>' +
          (avail ? '<div class="qty-control">' +
            '<button class="qty-btn dec-btn">−</button>' +
            '<span class="qty-num">' + qty + '</span>' +
            '<button class="qty-btn inc-btn">+</button>' +
          '</div>' : '') +
        '</div>' +
        (avail ? '<input class="item-note-input ' + (note ? 'show' : '') + '" placeholder="备注口味要求" value="' + note + '" data-item-id="' + item.id + '">' : '') +
      '</div></div>';
  }).join('');
  container.querySelectorAll('.inc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { addToCart(parseInt(e.target.closest('.menu-item').dataset.id), 1); });
  });
  container.querySelectorAll('.dec-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { addToCart(parseInt(e.target.closest('.menu-item').dataset.id), -1); });
  });
  container.querySelectorAll('.item-note-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.itemId);
      const ci = state.cart.find(c => c.menu_item_id === id);
      if (ci) ci.note = e.target.value;
    });
  });
}
function findMenuItem(id) {
  for (const cat of state.menuData) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}
function addToCart(itemId, delta) {
  const item = findMenuItem(itemId);
  if (!item) return;
  let cartItem = state.cart.find(c => c.menu_item_id === itemId);
  if (cartItem) {
    cartItem.quantity += delta;
    if (cartItem.quantity <= 0) state.cart = state.cart.filter(c => c.menu_item_id !== itemId);
  } else if (delta > 0) {
    state.cart.push({ menu_item_id: item.id, item_name: item.name, price: item.price, quantity: delta, note: '' });
  }
  renderMenu();
  updateCartBar();
}
function updateCartBar() {
  const cnt = state.cart.reduce((s, c) => s + c.quantity, 0);
  const tot = state.cart.reduce((s, c) => s + c.price * c.quantity, 0);
  $('cart-count').textContent = cnt;
  $('cart-bar-total').textContent = '¥' + tot.toFixed(2);
  $('cart-bar').classList.toggle('show', cnt > 0);
}
function openCartView() {
  state.cartOpen = true;
  $('view-cart').classList.add('active');
  backBtn.style.display = 'block';
  title.textContent = '购物车';
  renderCartItems();
}
function closeCartView() {
  state.cartOpen = false;
  $('view-cart').classList.remove('active');
  backBtn.style.display = 'none';
  title.textContent = state.currentView === 'menu' ? '点菜系统' : state.currentView === 'orders' ? '订单' : '管理菜单';
}
function renderCartItems() {
  const container = $('cart-items');
  if (state.cart.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><p>购物车是空的</p></div>';
    $('cart-total').textContent = '合计: ¥0.00';
    return;
  }
  container.innerHTML = state.cart.map(item =>
    '<div class="cart-item" data-id="' + item.menu_item_id + '">' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.item_name + '</div>' +
        (item.note ? '<div class="cart-item-note">备注: ' + item.note + '</div>' : '') +
      '</div>' +
      '<div class="qty-control">' +
        '<button class="qty-btn cart-dec">−</button>' +
        '<span class="qty-num">' + item.quantity + '</span>' +
        '<button class="qty-btn cart-inc">+</button>' +
      '</div>' +
      '<div class="cart-item-price">¥' + (item.price * item.quantity).toFixed(2) + '</div>' +
    '</div>'
  ).join('');
  container.querySelectorAll('.cart-inc').forEach(btn => {
    btn.addEventListener('click', (e) => { addToCart(parseInt(e.target.closest('.cart-item').dataset.id), 1); renderCartItems(); });
  });
  container.querySelectorAll('.cart-dec').forEach(btn => {
    btn.addEventListener('click', (e) => { addToCart(parseInt(e.target.closest('.cart-item').dataset.id), -1); renderCartItems(); });
  });
  const total = state.cart.reduce((s, c) => s + c.price * c.quantity, 0);
  $('cart-total').textContent = '合计: ¥' + total.toFixed(2);
}
async function submitOrder() {
  if (state.cart.length === 0) return;
  const note = $('order-note').value;
  try {
    const order = await API.createOrder({
      items: state.cart.map(c => ({ menu_item_id: c.menu_item_id, item_name: c.item_name, price: c.price, quantity: c.quantity, note: c.note || '' })),
      note: note
    });
    if (SOCKET.io && SOCKET.connected) SOCKET.io.emit('new_order', order);
    state.cart = [];
    $('order-note').value = '';
    closeCartView();
    updateCartBar();
    renderMenu();
    showToast('订单已提交 #' + order.order_no);
  } catch (e) { showToast('提交失败: ' + e.message); }
}
async function loadOrders() {
  const container = $('orders-list');
  try {
    const orders = await API.getOrders();
    if (orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>暂无订单</p></div>';
      return;
    }
    container.innerHTML = orders.map(order => {
      const itemsText = order.items.map(i => i.item_name + ' x' + i.quantity).join('、');
      return '<div class="order-card" data-id="' + order.id + '">' +
        '<div class="order-card-header">' +
          '<span class="order-no">#' + order.order_no + '</span>' +
          '<span class="order-status status-' + order.status + '">' + statusText(order.status) + '</span>' +
        '</div>' +
        '<div class="order-card-items">' + itemsText + '</div>' +
        (order.note ? '<div class="order-card-note">📝 ' + order.note + '</div>' : '') +
        '<div class="order-card-footer">' +
          '<span class="order-time">' + formatTime(order.created_at) + '</span>' +
          '<span class="order-total">' + order.total_price.toFixed(2) + '</span>' +
        '</div>' +
        '<div class="order-status-actions">' + statusActions(order) + '</div></div>';
    }).join('');
    container.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.order-status-actions')) return;
        showOrderDetail(parseInt(card.dataset.id));
      });
      card.querySelectorAll('.order-status-actions button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const updated = await API.updateOrderStatus(parseInt(card.dataset.id), btn.dataset.status);
            if (SOCKET.io && SOCKET.connected) SOCKET.io.emit('order_updated', updated);
            showToast('状态已更新');
            loadOrders();
          } catch (err) { showToast('更新失败'); }
        });
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>加载订单失败</p></div>';
  }
}
function statusText(s) {
  const map = { pending: '待处理', preparing: '准备中', served: '已上菜', completed: '已完成', cancelled: '已取消' };
  return map[s] || s;
}
function statusActions(order) {
  const a = {
    pending: '<button data-status="preparing" class="btn-success">开始准备</button><button data-status="cancelled">取消订单</button>',
    preparing: '<button data-status="served" class="btn-success">已上菜</button>',
    served: '<button data-status="completed">完成</button>',
    completed: '', cancelled: ''
  };
  return a[order.status] || '';
}
function formatTime(t) {
  if (!t) return '';
  const d = new Date(t + 'Z');
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
async function showOrderDetail(orderId) {
  try {
    const order = await API.getOrder(orderId);
    const itemsHtml = order.items.map(i =>
      '<div class="detail-item"><span>' + i.item_name + ' x' + i.quantity + (i.note ? ' 📝 ' + i.note : '') + '</span><span>¥' + (i.price * i.quantity).toFixed(2) + '</span></div>'
    ).join('');
    $('order-detail-content').innerHTML =
      '<div class="order-detail">' +
        '<div class="order-detail-header">' +
          '<h2>#' + order.order_no + '</h2>' +
          '<span class="order-status status-' + order.status + '">' + statusText(order.status) + '</span>' +
        '</div>' +
        '<div class="detail-section"><h4>菜品明细</h4>' + itemsHtml + '<div class="order-detail-total">' + order.total_price.toFixed(2) + '</div></div>' +
        (order.note ? '<div class="detail-section"><h4>订单备注</h4><div class="order-detail-note">' + order.note + '</div></div>' : '') +
        '<div class="detail-section"><h4>时间</h4><p style="font-size:13px;color:var(--text-light);">' + new Date(order.created_at + 'Z').toLocaleString('zh-CN') + '</p></div>' +
        '<div style="margin-top:12px;"><button class="btn" onclick="showView(\'orders\')">返回订单列表</button></div>' +
      '</div>';
    $('view-order-detail').classList.add('active');
    backBtn.style.display = 'block';
    title.textContent = '订单详情';
  } catch (e) { showToast('加载订单详情失败'); }
}
async function loadManageView() {
  const container = $('manage-items');
  try {
    const cats = await API.getCategories();
    const items = await API.getAllItems();
    if (cats.length === 0 && items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">⚙</div><p>开始添加分类和菜品吧</p></div>';
      return;
    }
    container.innerHTML = cats.map(cat => {
      const ci = items.filter(i => i.category_id === cat.id);
      return '<div class="manage-category">' +
        '<div class="manage-category-title"><span>' + cat.name + '</span><span class="del-cat" data-cat-id="' + cat.id + '">删除</span></div>' +
        (ci.length === 0 ? '<p style="color:var(--text-light);font-size:13px;padding:8px 0;">暂无菜品</p>' :
          ci.map(item =>
            '<div class="manage-item" data-id="' + item.id + '">' +
              '<div class="manage-item-thumb">' + (item.image ? '<img src="' + item.image + '">' : '<span class="no-img">🍜</span>') + '</div>' +
              '<div class="manage-item-info"><div class="manage-item-name">' + item.name + (item.available ? '' : ' (已停售)') + '</div><div class="manage-item-price">¥' + item.price.toFixed(2) + '</div></div>' +
              '<div class="manage-item-actions">' +
                '<button class="btn-edit" data-id="' + item.id + '">编辑</button>' +
                '<button class="btn-toggle" data-id="' + item.id + '">' + (item.available ? '停售' : '上架') + '</button>' +
                '<button class="btn-del" data-id="' + item.id + '">删除</button>' +
              '</div></div>'
          ).join('')
        ) + '</div>';
    }).join('');
    container.querySelectorAll('.del-cat').forEach(el => {
      el.addEventListener('click', async () => {
        if (!confirm('确定删除此分类？')) return;
        try { await API.deleteCategory(el.dataset.catId); showToast('已删除'); loadManageView(); loadMenu(); } catch (e) { showToast(e.message); }
      });
    });
    container.querySelectorAll('.btn-edit').forEach(el => {
      el.addEventListener('click', () => {
        const item = items.find(i => i.id == el.dataset.id);
        if (item) openDishModal(item);
      });
    });
    container.querySelectorAll('.btn-toggle').forEach(el => {
      el.addEventListener('click', async () => {
        const item = items.find(i => i.id == el.dataset.id);
        if (!item) return;
        try { await API.updateItem(el.dataset.id, { available: !item.available }); showToast(item.available ? '已停售' : '已上架'); loadManageView(); loadMenu(); } catch (e) { showToast(e.message); }
      });
    });
    container.querySelectorAll('.btn-del').forEach(el => {
      el.addEventListener('click', async () => {
        if (!confirm('确定删除此菜品？')) return;
        try { await API.deleteItem(el.dataset.id); showToast('已删除'); loadManageView(); loadMenu(); } catch (e) { showToast(e.message); }
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>加载失败</p></div>';
  }
}
function openDishModal(item) {
  state.editingDish = item;
  $('dish-modal-title').textContent = item ? '编辑菜品' : '添加菜品';
  $('dish-id').value = item ? item.id : '';
  $('dish-name').value = item ? item.name : '';
  $('dish-price').value = item ? item.price : '';
  $('dish-description').value = item ? item.description : '';
  $('dish-image-preview').innerHTML = item && item.image ? '<img src="' + item.image + '">' : '';
  $('dish-image').value = '';
  const sel = $('dish-category');
  sel.innerHTML = state.categories.map(c => '<option value="' + c.id + '" ' + (item && item.category_id == c.id ? 'selected' : '') + '>' + c.name + '</option>').join('');
  $('dish-modal').classList.add('show');
}
function closeDishModal() { $('dish-modal').classList.remove('show'); state.editingDish = null; }
function previewDishImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { $('dish-image-preview').innerHTML = '<img src="' + e.target.result + '">'; };
  reader.readAsDataURL(file);
}
async function saveDish(e) {
  e.preventDefault();
  const id = $('dish-id').value;
  const name = $('dish-name').value.trim();
  const price = parseFloat($('dish-price').value);
  const category_id = parseInt($('dish-category').value);
  const description = $('dish-description').value.trim();
  let image = state.editingDish ? state.editingDish.image : '';
  const fileInput = $('dish-image');
  if (fileInput.files && fileInput.files[0]) {
    try { const r = await API.uploadImage(fileInput.files[0]); image = r.url; } catch (err) { showToast('图片上传失败'); return; }
  }
  const data = { name, price, description, image, category_id };
  try {
    if (id) { await API.updateItem(id, data); showToast('菜品已更新'); }
    else { await API.createItem(data); showToast('菜品已添加'); }
    closeDishModal();
    loadManageView();
    loadMenu();
  } catch (err) { showToast('保存失败'); }
}
async function saveCategory(e) {
  e.preventDefault();
  const name = $('category-name').value.trim();
  if (!name) return;
  try {
    await API.createCategory(name);
    $('category-modal').classList.remove('show');
    showToast('分类已添加');
    state.categories = await API.getCategories();
    loadManageView();
    loadMenu();
  } catch (err) { showToast('添加失败'); }
}
