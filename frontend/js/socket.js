const SOCKET = {
  io: null,
  connected: false,

  connect() {
    this.io = io();

    this.io.on('connect', () => {
      this.connected = true;
      updateConnectionStatus(true);
      console.log('Socket 已连接');
    });

    this.io.on('disconnect', () => {
      this.connected = false;
      updateConnectionStatus(false);
      console.log('Socket 已断开');
    });

    this.io.on('new_order', (order) => {
      console.log('新订单:', order);
      showToast('收到新订单 #' + order.order_no);
      if (typeof refreshOrders === 'function') refreshOrders();
    });

    this.io.on('order_updated', (order) => {
      console.log('订单更新:', order);
      showToast('订单 ' + order.order_no + ' 已更新');
      if (typeof refreshOrders === 'function') refreshOrders();
    });

    this.io.on('connect_error', (err) => {
      console.error('Socket 连接错误:', err.message);
    });
  },

  emitNewOrder(order) {
    if (this.io && this.connected) {
      this.io.emit('new_order', order);
    }
  },

  emitOrderUpdated(order) {
    if (this.io && this.connected) {
      this.io.emit('order_updated', order);
    }
  }
};

function updateConnectionStatus(connected) {
  const el = document.getElementById('connection-status');
  if (!el) return;
  if (connected) {
    el.textContent = '已连接 (实时)';
    el.className = 'status-connected';
  } else {
    el.textContent = '未连接';
    el.className = 'status-disconnected';
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

let refreshOrders = null;
function setRefreshOrders(fn) { refreshOrders = fn; }
