// Mock nhẹ cho Zustand và localStorage để kiểm thử trực tiếp useCartStore của apps/web trong môi trường Node
jest.mock(
  'zustand',
  () => ({
    create: () => (initializer: any) => {
      let state: any;
      const setState = (partial: any) => {
        const nextState = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...nextState };
      };
      const getState = () => state;
      state = initializer(setState, getState);
      const store: any = (selector?: any) => (selector ? selector(state) : state);
      store.getState = getState;
      store.setState = setState;
      return store;
    },
  }),
  { virtual: true },
);

jest.mock(
  'zustand/middleware',
  () => ({
    persist: (config: any) => config,
  }),
  { virtual: true },
);

import { useCartStore } from '../apps/web/src/store/useCartStore';
import { MOCK_PRODUCTS, TOPPING_OPTIONS } from '../apps/web/src/lib/mock-data';

describe('SRS Nhóm 3: Giỏ hàng (FR-07..FR-09)', () => {
  const storageMap = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: (key: string, val: string) => storageMap.set(key, val),
        removeItem: (key: string) => storageMap.delete(key),
        clear: () => storageMap.clear(),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    storageMap.clear();
    useCartStore.setState({
      items: [],
      isOpen: false,
      promoCode: null,
      discountPercent: 0,
      activeUserKey: 'guest',
      userCarts: {},
      userPromos: {},
    });
  });

  describe('FR-07: Thao tác thêm, sửa, xóa mục trong giỏ hàng', () => {
    it('TC-07: Thêm món vào giỏ, tự động cộng dồn qty khi trùng (productId, size, toppings), cập nhật số lượng và xóa món', () => {
      const product = MOCK_PRODUCTS[0]; // Cà Phê Sữa Đá Sài Gòn - 35.000đ
      const pearlTopping = TOPPING_OPTIONS[0]; // Trân châu hoàng kim - 8.000đ

      // Thêm lần 1: 1 ly Size M (+6k) + Trân châu (+8k)
      useCartStore.getState().addItem(product, 'M', [pearlTopping], 1);
      // Thêm lần 2 cùng món, cùng Size M và cùng Topping: số lượng phải cộng dồn lên 3 thay vì tạo dòng mới
      useCartStore.getState().addItem(product, 'M', [pearlTopping], 2);

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].qty).toBe(3);
      expect(useCartStore.getState().getTotalCount()).toBe(3);

      // Cập nhật giảm số lượng về 2
      const cartItemId = useCartStore.getState().items[0].cartItemId;
      useCartStore.getState().updateQty(cartItemId, 2);
      expect(useCartStore.getState().items[0].qty).toBe(2);
      expect(useCartStore.getState().getTotalCount()).toBe(2);

      // Xóa mục khỏi giỏ hàng
      useCartStore.getState().removeItem(cartItemId);
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().getTotalCount()).toBe(0);
    });
  });

  describe('FR-08: Tính tổng tạm tính trong giỏ hàng', () => {
    it('TC-08: Tự động tính chính xác thành tiền từng dòng (lineTotal) và tổng tạm tính (subtotal) của giỏ hàng', () => {
      const coffee = MOCK_PRODUCTS[0]; // 35.000đ
      const americano = MOCK_PRODUCTS[1]; // 40.000đ
      const creamTopping = TOPPING_OPTIONS[1]; // 12.000đ

      // Món 1: 35.000đ + Size M (6.000đ) + Kem (12.000đ) = 53.000đ x 2 = 106.000đ
      useCartStore.getState().addItem(coffee, 'M', [creamTopping], 2);
      // Món 2: 40.000đ + Size S (0đ) = 40.000đ x 1 = 40.000đ
      useCartStore.getState().addItem(americano, 'S', [], 1);

      const items = useCartStore.getState().items;
      expect(items[0].lineTotal).toBe(106000);
      expect(items[1].lineTotal).toBe(40000);
      expect(useCartStore.getState().getSubtotal()).toBe(146000);

      // Khi cập nhật qty <= 0 thì tự động xóa món và tính lại subtotal
      useCartStore.getState().updateQty(items[0].cartItemId, 0);
      expect(useCartStore.getState().getSubtotal()).toBe(40000);
    });
  });

  describe('FR-09: Lưu trữ giỏ hàng bền vững theo tài khoản', () => {
    it('TC-09: Lưu giỏ hàng trên localStorage tách biệt theo userKey, tự động gộp giỏ guest khi đăng nhập và ẩn giỏ khi đăng xuất', () => {
      const product = MOCK_PRODUCTS[0]; // 35.000đ
      const mockUser = {
        id: '10',
        name: 'sinhvien',
        email: 'sinhvien@sgu.edu.vn',
        loyaltyPoints: 50,
      };

      // 1. Khi chưa đăng nhập (guest), chọn 1 ly Size S
      useCartStore.getState().addItem(product, 'S', [], 1);
      expect(useCartStore.getState().activeUserKey).toBe('guest');
      expect(useCartStore.getState().getTotalCount()).toBe(1);

      // 2. Đăng nhập vào tài khoản sinhvien@sgu.edu.vn -> tự động gộp giỏ guest sang giỏ của user
      useCartStore.getState().loadUserCart(mockUser);
      expect(useCartStore.getState().activeUserKey).toBe('sinhvien@sgu.edu.vn');
      expect(useCartStore.getState().getTotalCount()).toBe(1);

      // Thêm 1 ly nữa khi đang đăng nhập -> tổng cộng 2 ly
      useCartStore.getState().addItem(product, 'S', [], 1);
      expect(useCartStore.getState().getTotalCount()).toBe(2);

      // 3. Đăng xuất -> ẩn giỏ hiện tại về rỗng cho khách mới, nhưng vẫn bảo toàn giỏ của user trong storage
      useCartStore.getState().saveCurrentCartOnLogout(mockUser);
      expect(useCartStore.getState().activeUserKey).toBe('guest');
      expect(useCartStore.getState().items).toHaveLength(0);

      // 4. Đăng nhập lại tài khoản cũ -> khôi phục đúng 2 ly đã lưu
      useCartStore.getState().loadUserCart(mockUser);
      expect(useCartStore.getState().getTotalCount()).toBe(2);
    });
  });
});

