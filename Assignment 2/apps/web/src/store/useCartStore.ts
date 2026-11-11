import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, DrinkSize, Product, Topping, User } from '@/types';
import { SIZE_OPTIONS, PROMO_CODES } from '@/lib/mock-data';

export const getUserKey = (user: User | null | undefined): string => {
  if (!user) return 'guest';
  if (user.email) return user.email.toLowerCase().trim();
  if (user.id) return String(user.id).toLowerCase().trim();
  return 'guest';
};

// Helper đọc/ghi trực tiếp vào localStorage cho từng userKey độc lập
const getStoredUserCart = (key: string): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`brewlite_cart_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setStoredUserCart = (key: string, items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`brewlite_cart_${key}`, JSON.stringify(items));
  } catch (e) {}
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  promoCode: string | null;
  discountPercent: number;
  activeUserKey: string;
  userCarts: Record<string, CartItem[]>;
  userPromos: Record<string, { promoCode: string | null; discountPercent: number }>;

  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: DrinkSize, toppings: Topping[], qty: number) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  removeItem: (cartItemId: string) => void;
  applyPromo: (code: string) => { success: boolean; message: string };
  clearCart: () => void;
  getTotalCount: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;

  loadUserCart: (user: User | null | undefined) => void;
  saveCurrentCartOnLogout: (user: User | null | undefined) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,
      discountPercent: 0,
      activeUserKey: 'guest',
      userCarts: {},
      userPromos: {},

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      loadUserCart: (user) => {
        const key = getUserKey(user);
        const state = get();

        // 1. Lấy dữ liệu giỏ hàng của user (từ in-memory userCarts hoặc fallback trực tiếp localStorage)
        const savedFromMemory = (state.userCarts && state.userCarts[key]) || [];
        const savedFromStorage = getStoredUserCart(key);
        const savedItems = savedFromMemory.length > 0 ? savedFromMemory : savedFromStorage;

        // 2. Lấy dữ liệu giỏ hàng vãng lai (guest)
        const guestFromMemory = (state.userCarts && state.userCarts['guest']) || [];
        const guestFromStorage = getStoredUserCart('guest');
        const guestItems = guestFromMemory.length > 0 ? guestFromMemory : guestFromStorage;

        const savedPromo = (state.userPromos && state.userPromos[key]) || { promoCode: null, discountPercent: 0 };

        let finalItems = [...savedItems];

        // Nếu user đăng nhập (key !== 'guest') và trước đó có chọn đồ lúc chưa đăng nhập (guest),
        // gộp các món guest vào giỏ của user
        if (key !== 'guest' && guestItems.length > 0) {
          for (const gItem of guestItems) {
            const idx = finalItems.findIndex((i) => i.cartItemId === gItem.cartItemId);
            if (idx > -1) {
              const existing = finalItems[idx];
              const newQty = existing.qty + gItem.qty;
              finalItems[idx] = {
                ...existing,
                qty: newQty,
                lineTotal: newQty * existing.unitPrice,
              };
            } else {
              finalItems.push(gItem);
            }
          }
          // Sau khi gộp vào user, reset giỏ guest
          setStoredUserCart('guest', []);
        }

        // Lưu giỏ user vào localStorage
        setStoredUserCart(key, finalItems);

        set({
          items: finalItems,
          promoCode: savedPromo.promoCode,
          discountPercent: savedPromo.discountPercent,
          activeUserKey: key,
          userCarts: {
            ...(state.userCarts || {}),
            [key]: finalItems,
            ...(key !== 'guest' ? { guest: [] } : {}),
          },
          userPromos: {
            ...(state.userPromos || {}),
            [key]: savedPromo,
          },
        });
      },

      saveCurrentCartOnLogout: (user) => {
        const key = getUserKey(user);
        const state = get();
        const currentItems = state.items;

        // Lưu giữ nguyên giỏ hàng của user vào localStorage và state.userCarts
        if (key !== 'guest') {
          setStoredUserCart(key, currentItems);
        }

        // Dọn dẹp trạng thái hiển thị cho khách mới (guest)
        setStoredUserCart('guest', []);

        set({
          activeUserKey: 'guest',
          items: [],
          promoCode: null,
          discountPercent: 0,
          userCarts: {
            ...(state.userCarts || {}),
            [key]: currentItems,
            guest: [],
          },
          userPromos: {
            ...(state.userPromos || {}),
            [key]: { promoCode: state.promoCode, discountPercent: state.discountPercent },
          },
        });
      },

      addItem: (product, size, toppings, qty) => {
        const sizeDelta = SIZE_OPTIONS.find((s) => s.value === size)?.priceDelta || 0;
        const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
        const unitPrice = product.price + sizeDelta + toppingsPrice;

        const toppingKey = toppings.map((t) => t.id).sort().join('-');
        const cartItemId = `${product.id}_${size}_${toppingKey}`;

        set((state) => {
          const key = state.activeUserKey || 'guest';
          let updatedItems = [...state.items];
          const existingIndex = updatedItems.findIndex((i) => i.cartItemId === cartItemId);
          if (existingIndex > -1) {
            const newQty = updatedItems[existingIndex].qty + qty;
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              qty: newQty,
              lineTotal: newQty * unitPrice,
            };
          } else {
            updatedItems.push({
              cartItemId,
              product,
              size,
              toppings,
              qty,
              unitPrice,
              lineTotal: qty * unitPrice,
            });
          }

          // Đồng bộ ngay vào localStorage cho key hiện tại
          setStoredUserCart(key, updatedItems);

          return {
            items: updatedItems,
            isOpen: true,
            userCarts: {
              ...(state.userCarts || {}),
              [key]: updatedItems,
            },
          };
        });
      },

      updateQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => {
          const key = state.activeUserKey || 'guest';
          const updatedItems = state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, qty, lineTotal: qty * item.unitPrice }
              : item
          );

          setStoredUserCart(key, updatedItems);

          return {
            items: updatedItems,
            userCarts: {
              ...(state.userCarts || {}),
              [key]: updatedItems,
            },
          };
        });
      },

      removeItem: (cartItemId) =>
        set((state) => {
          const key = state.activeUserKey || 'guest';
          const updatedItems = state.items.filter((i) => i.cartItemId !== cartItemId);

          setStoredUserCart(key, updatedItems);

          return {
            items: updatedItems,
            userCarts: {
              ...(state.userCarts || {}),
              [key]: updatedItems,
            },
          };
        }),

      applyPromo: (code) => {
        const normalized = code.trim().toUpperCase();
        const found = PROMO_CODES[normalized];
        if (!found) {
          return { success: false, message: 'Mã giảm giá không hợp lệ (Thử: BREWLITE10, GIAM10K hoặc SGU2026)' };
        }
        const discountPercent = found.discountPercent || 0;
        set((state) => {
          const key = state.activeUserKey || 'guest';
          return {
            promoCode: normalized,
            discountPercent,
            userPromos: {
              ...(state.userPromos || {}),
              [key]: { promoCode: normalized, discountPercent },
            },
          };
        });
        return { success: true, message: `Áp dụng thành công: ${found.description}` };
      },

      clearCart: () =>
        set((state) => {
          const key = state.activeUserKey || 'guest';
          setStoredUserCart(key, []);
          return {
            items: [],
            promoCode: null,
            discountPercent: 0,
            userCarts: {
              ...(state.userCarts || {}),
              [key]: [],
            },
            userPromos: {
              ...(state.userPromos || {}),
              [key]: { promoCode: null, discountPercent: 0 },
            },
          };
        }),

      getTotalCount: () => get().items.reduce((sum, item) => sum + item.qty, 0),

      getSubtotal: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),

      getDiscountAmount: () => {
        const promo = get().promoCode ? PROMO_CODES[get().promoCode!] : null;
        if (promo?.discountAmount) {
          return Math.min(get().getSubtotal(), promo.discountAmount);
        }
        return Math.round((get().getSubtotal() * get().discountPercent) / 100);
      },

      getFinalTotal: () => Math.max(0, get().getSubtotal() - get().getDiscountAmount()),
    }),
    {
      name: 'brewlite-cart-storage',
    }
  )
);
