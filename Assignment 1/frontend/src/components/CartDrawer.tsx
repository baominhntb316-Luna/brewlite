'use client';

import { useRouter } from 'next/navigation';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { formatVND } from '@/lib/mock-data';

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, updateQty, removeItem, getSubtotal } = useCartStore();

  if (!isOpen) return null;

  const subtotal = getSubtotal();

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#1B4332]" />
            <h2 className="text-lg font-bold text-stone-900">Giỏ hàng của bạn</h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20 text-stone-400 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-sm font-medium">Giỏ hàng đang trống</p>
              <p className="text-xs">Hãy chọn một món đồ uống yêu thích nhé!</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-100"
              >
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-stone-900 text-sm truncate">
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Size {item.size}
                    {item.toppings.length > 0 &&
                      ` • +${item.toppings.map((t) => t.name).join(', ')}`}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2 py-1">
                      <button
                        onClick={() => updateQty(item.cartItemId, item.qty - 1)}
                        className="text-stone-600 hover:text-stone-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.cartItemId, item.qty + 1)}
                        className="text-stone-600 hover:text-stone-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-bold text-sm text-[#1B4332]">
                      {formatVND(item.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-stone-100 bg-stone-50/60 space-y-4">
            <div className="flex items-center justify-between text-base">
              <span className="text-stone-600 font-medium">Tổng tạm tính</span>
              <span className="text-xl font-bold text-stone-900">{formatVND(subtotal)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#1B4332] hover:bg-[#143325] text-white font-semibold py-3.5 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <span>Thanh toán ({formatVND(subtotal)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}