import { MOCK_PRODUCTS } from '../../../../abc/apps/web/src/lib/mock-data';
import { CartItem, Order, OrderStatus, PaymentMethod, Product } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';


const getStoredOrders = (): Order[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('brewlite-orders');
  return raw ? JSON.parse(raw) : [];
};

const saveStoredOrders = (orders: Order[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brewlite-orders', JSON.stringify(orders));
  }
};

export const api = {
  // Task 2 & 3: Lấy danh sách sản phẩm
  async getProducts(): Promise<Product[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_PRODUCTS;
    }
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error('Không thể tải danh sách đồ uống');
    return res.json();
  },

  // Task 7: Đăng nhập / Đăng ký
  async login(email: string, password: string) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        accessToken: 'mock-jwt-token-sgu-2026',
        user: {
          id: 'user-1',
          name: email.split('@')[0],
          email,
          loyaltyPoints: 120,
        },
      };
    }
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Email hoặc mật khẩu không đúng');
    return res.json();
  },

  
  async register(email: string, password: string) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        accessToken: 'mock-jwt-token-sgu-2026',
        user: {
          id: `user-${Date.now()}`,
          name: email.split('@')[0],
          email,
          loyaltyPoints: 0,
        },
      };
    }

    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        Array.isArray(errData.message)
          ? errData.message[0]
          : errData.message || 'Đăng ký thất bại (Email đã tồn tại hoặc mật khẩu < 6 ký tự)'
      );
    }
    return res.json();
  },

  // Task 6: Tạo đơn hàng trạng thái PENDING
  async createOrder(
    items: CartItem[],
    subtotal: number,
    discount: number,
    total: number,
    token: string,
    couponCode?: string,
  ): Promise<Order> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 450));
      const newOrder: Order = {
        id: `${Math.floor(1000 + Math.random() * 9000)}`,
        userId: 'user-1',
        status: 'PENDING',
        items,
        subtotal,
        discount,
        total,
        createdAt: new Date().toISOString(),
      };
      const orders = getStoredOrders();
      saveStoredOrders([newOrder, ...orders]);
      return newOrder;
    }

    // Chuyển đổi CartItem của Web sang đúng cấu hình CreateOrderDto của NestJS
    const payloadItems = items.map((item) => ({
      productId: Number(item.product.id),
      size: item.size,
      toppings: Array.isArray(item.toppings)
        ? item.toppings.map((t) => (typeof t === 'string' ? t : t.name))
        : [],
      qty: Number(item.qty),
    }));

    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: payloadItems,
        couponCode: couponCode || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Không thể khởi tạo đơn hàng';
      throw new Error(msg);
    }
    const createdOrder = await res.json();
    return {
      ...createdOrder,
      id: String(createdOrder.id),
    };
  },

  // Task 8 & Task 10: Thanh toán không tiền mặt kèm Idempotency-Key
  async payOrder(
    orderId: string | number,
    method: PaymentMethod,
    idempotencyKey: string,
    simulateFail: boolean,
    token: string
  ): Promise<any> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      const orders = getStoredOrders();
      const idx = orders.findIndex((o) => o.id === String(orderId));
      if (idx === -1) throw new Error('Không tìm thấy đơn hàng');

      orders[idx].paymentMethod = method;
      orders[idx].status = simulateFail ? 'PAYMENT_FAILED' : 'PAID';
      saveStoredOrders(orders);

      if (simulateFail) {
        throw new Error('Giao dịch thanh toán bị từ chối. Đơn chuyển sang PAYMENT_FAILED.');
      }
      return orders[idx];
    }

    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        orderId: Number(orderId),
        method,
        simulateFailure: simulateFail,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Thanh toán thất bại';
      throw new Error(msg);
    }
    const payResult = await res.json();
    if (payResult.order && payResult.order.status === 'PAYMENT_FAILED') {
      throw new Error('Giao dịch thanh toán bị từ chối. Đơn chuyển sang PAYMENT_FAILED.');
    }
    return payResult;
  },

  // Task 9: Lấy chi tiết đơn và lịch sử đơn hàng (/orders/me)
  async getMyOrders(token: string): Promise<Order[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return getStoredOrders();
    }
    const res = await fetch(`${API_URL}/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Không thể tải lịch sử đơn hàng');
    return res.json();
  },

  // Task 10: Chuyển trạng thái đơn hàng (ví dụ: CANCELLED để hoàn kho)
  async updateOrderStatus(
    orderId: string | number,
    status: OrderStatus,
    token: string,
  ): Promise<any> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const orders = getStoredOrders();
      const idx = orders.findIndex((o) => String(o.id) === String(orderId));
      if (idx === -1) throw new Error('Không tìm thấy đơn hàng');
      orders[idx].status = status;
      saveStoredOrders(orders);
      return orders[idx];
    }

    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Không thể cập nhật trạng thái đơn hàng';
      throw new Error(msg);
    }
    return res.json();
  },
};