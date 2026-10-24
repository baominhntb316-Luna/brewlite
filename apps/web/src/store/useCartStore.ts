import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, DrinkSize, Product, Topping } from '@/types';
import { SIZE_OPTIONS, PROMO_CODES } from '@/lib/mock-data';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  promoCode: string | null;
  discountPercent: number;
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
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,
      discountPercent: 0,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (product, size, toppings, qty) => {
        const sizeDelta = SIZE_OPTIONS.find((s) => s.value === size)?.priceDelta || 0;
        const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
        const unitPrice = product.price + sizeDelta + toppingsPrice;

        const toppingKey = toppings.map((t) => t.id).sort().join('-');
        const cartItemId = `${product.id}_${size}_${toppingKey}`;

        set((state) => {
          const existingIndex = state.items.findIndex((i) => i.cartItemId === cartItemId);
          if (existingIndex > -1) {
            const updated = [...state.items];
            const newQty = updated[existingIndex].qty + qty;
            updated[existingIndex] = {
              ...updated[existingIndex],
              qty: newQty,
              lineTotal: newQty * unitPrice,
            };
            return { items: updated, isOpen: true };
          }
          return {
            items: [
              ...state.items,
              {
                cartItemId,
                product,
                size,
                toppings,
                qty,
                unitPrice,
                lineTotal: qty * unitPrice,
              },
            ],
            isOpen: true,
          };
        });
      },

      updateQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, qty, lineTotal: qty * item.unitPrice }
              : item
          ),
        }));
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      applyPromo: (code) => {
        const normalized = code.trim().toUpperCase();
        const found = PROMO_CODES[normalized];
        if (!found) {
          return { success: false, message: 'Mã giảm giá không hợp lệ (Thử: BREWLITE10, GIAM10K hoặc SGU2026)' };
        }
        set({ promoCode: normalized, discountPercent: found.discountPercent || 0 });
        return { success: true, message: `Áp dụng thành công: ${found.description}` };
      },

      clearCart: () => set({ items: [], promoCode: null, discountPercent: 0 }),

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
    { name: 'brewlite-cart-storage' }
  )
);