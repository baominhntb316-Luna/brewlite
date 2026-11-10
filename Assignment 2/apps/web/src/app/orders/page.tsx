'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVND } from '@/lib/mock-data';

export default function OrderHistoryPage() {
  const token = useAuthStore((s) => s.token);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMyOrders(token || '')
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Lịch sử đơn hàng của bạn</h1>

      {loading ? (
        <div className="text-stone-500 text-sm">Đang tải lịch sử đơn...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-stone-200 text-center space-y-3">
          <p className="font-semibold text-stone-700">Bạn chưa có đơn hàng nào</p>
          <Link
            href="/"
            className="inline-block bg-[#1B4332] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Đặt món ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-[#1B4332] transition"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="font-black text-lg text-stone-900">Đơn #{order.id}</span>
                  <span className="text-xs text-stone-400 block">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'PAYMENT_FAILED'
                      ? 'bg-red-100 text-red-700'
                      : order.status === 'CANCELLED'
                      ? 'bg-stone-200 text-stone-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between text-sm">
                <span className="text-stone-600">
                  {order.items.map((i) => `${i.product?.name || 'Đồ uống'} x${i.qty}`).join(', ')}
                </span>
                <span className="font-bold text-[#1B4332]">{formatVND(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}