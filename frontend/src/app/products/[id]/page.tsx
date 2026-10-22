'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Coffee, ArrowLeft } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVND } from '@/lib/mock-data';

const STATE_STEPS: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];

function OrderConfirmationContent() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    api.getMyOrders(token || '').then((orders) => {
      const found = orders.find((o) => String(o.id) === String(id));
      if (found) setOrder(found);
    });
  }, [id, token]);

  if (!order) {
    return <div className="text-center py-16 text-stone-500">Đang tải thông tin đơn hàng...</div>;
  }

  const currentStepIndex = STATE_STEPS.indexOf(order.status);

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-stone-200/80 shadow-lg text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1B4332] flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-stone-900">Đặt hàng thành công!</h1>
        <p className="text-sm text-stone-500">Mời bạn tới quầy nhận nước khi đơn báo READY</p>
      </div>

      <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 space-y-2">
        <div className="text-xs uppercase tracking-wider text-stone-400 font-bold">Mã đơn hàng</div>
        <div className="text-3xl font-black text-[#1B4332]">#{order.id}</div>
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          Trạng thái: {order.status}
        </div>
      </div>

      {/* Thanh trạng thái Order State Machine (Mục 9.1) */}
      <div className="pt-2">
        <div className="text-xs font-bold uppercase text-stone-400 mb-3">
          Tiến trình đơn hàng (Order State Machine)
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-[10px] font-bold">
          {STATE_STEPS.map((step, idx) => {
            const done = idx <= currentStepIndex;
            return (
              <div
                key={step}
                className={`py-2 px-1 rounded-xl border ${
                  done
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-stone-50 text-stone-400 border-stone-200'
                }`}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-left border-t border-stone-100 pt-4 space-y-2 text-sm">
        {order.items.map((item, idx) => (
          <div key={item.cartItemId || idx} className="flex justify-between">
            <span>
              {item.product?.name || 'Đồ uống'} ({item.size}) x{item.qty}
            </span>
            <span className="font-semibold">{formatVND(item.lineTotal)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-100">
          <span>Tổng đã thanh toán</span>
          <span className="text-[#1B4332]">{formatVND(order.total)}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/"
          className="flex-1 bg-[#1B4332] text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
        <Link
          href="/orders"
          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2"
        >
          <Coffee className="w-4 h-4" />
          <span>Lịch sử đơn</span>
        </Link>
      </div>
    </div>
  );
}
export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải thông tin đơn hàng...</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}