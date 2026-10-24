'use client';

import { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { DrinkSize, Product, Topping } from '@/types';
import { SIZE_OPTIONS, TOPPING_OPTIONS, formatVND } from '@/lib/mock-data';
import { useCartStore } from '@/store/useCartStore';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const [size, setSize] = useState<DrinkSize>('M');
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  if (!product) return null;

  const sizeDelta = SIZE_OPTIONS.find((s) => s.value === size)?.priceDelta || 0;
  const toppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const unitPrice = product.price + sizeDelta + toppingTotal;
  const totalPrice = unitPrice * qty;

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings((prev) =>
      prev.some((t) => t.id === topping.id)
        ? prev.filter((t) => t.id !== topping.id)
        : [...prev, topping]
    );
  };

  const handleAddToCart = () => {
    addItem(product, size, selectedToppings, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative h-56 bg-stone-100">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-stone-800 shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold text-stone-900">{product.name}</h3>
              <span className="text-lg font-bold text-[#1B4332]">
                {formatVND(product.price)}
              </span>
            </div>
            <p className="text-sm text-stone-500 mt-1">{product.description}</p>
          </div>

          {/* Chọn Size S / M / L */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              Chọn kích cỡ (Size) *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SIZE_OPTIONS.map((opt) => {
                const active = size === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSize(opt.value)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      active
                        ? 'border-[#1B4332] bg-[#1B4332]/8 text-[#1B4332]'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="font-bold text-sm">Size {opt.value}</div>
                    <div className="text-xs opacity-80">
                      {opt.priceDelta === 0 ? 'Giá gốc' : `+${formatVND(opt.priceDelta)}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Topping */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              Topping thêm (Tùy chọn)
            </label>
            <div className="space-y-2">
              {TOPPING_OPTIONS.map((tp) => {
                const checked = selectedToppings.some((t) => t.id === tp.id);
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => toggleTopping(tp)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition ${
                      checked
                        ? 'border-[#1B4332] bg-[#1B4332]/5 font-semibold text-stone-900'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          checked
                            ? 'bg-[#1B4332] border-[#1B4332] text-white'
                            : 'border-stone-300'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span>{tp.name}</span>
                    </div>
                    <span className="text-stone-600">+{formatVND(tp.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Số lượng & Nút thêm vào giỏ */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-stone-100 rounded-2xl p-1.5">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-stone-900">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-[#1B4332] hover:bg-[#143325] text-white font-semibold py-3.5 px-5 rounded-2xl shadow-md transition flex items-center justify-between"
            >
              <span>Thêm vào giỏ</span>
              <span>{formatVND(totalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}