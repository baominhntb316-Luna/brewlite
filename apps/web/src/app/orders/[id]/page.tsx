'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Coffee, ArrowLeft, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVND } from '@/lib/mock-data';

const STATE_STEPS: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];

function OrderConfirmationContent() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadOrder = () => {
    api.getMyOrders(token || '').then((orders) => {
      const found = orders.find((o) => String(o.id) === String(id));
      if (found) setOrder(found);
    });
  };

  useEffect(() => {
    loadOrder();
  }, [id, token]);

  const handleCancelOrder = async () => {
    if (!order || !token) return;
    setActionLoading(true);
    setActionMessage('');
    try {
      await api.updateOrderStatus(order.id, 'CANCELLED', token);
      setActionMessage('Đã hủy đơn hàng thành công và hoàn trả lại số lượng tồn kho!');
      loadOrder();
    } catch (err: any) {
      setActionMessage(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order || !token) return;
    setActionLoading(true);
    setActionMessage('');
    try {
      const retryKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await api.payOrder(order.id, order.paymentMethod || 'WALLET', retryKey, false, token);
      setActionMessage('Thanh toán thành công!');
      loadOrder();
    } catch (err: any) {
      setActionMessage(err.message || 'Thanh toán thất bại, vui lòng thử lại');
    } finally {
      setActionLoading(false);
    }
  };

  if (!order) {
    return <div className="text-center py-16 text-stone-500">Đang tải thông tin đơn hàng...</div>;
  }

  const isFailed = order.status === 'PAYMENT_FAILED';
  const isCancelled = order.status === 'CANCELLED';
  const currentStepIndex = STATE_STEPS.indexOf(order.status);

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-stone-200/80 shadow-lg text-center space-y-6">
      {/* Icon trạng thái */}
      {isCancelled ? (
        <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10" />
        </div>
      ) : isFailed ? (
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10" />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1B4332] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
      )}

      {/* Tiêu đề & mô tả */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-stone-900">
          {isCancelled
            ? 'Đơn hàng đã hủy'
            : isFailed
            ? 'Thanh toán chưa thành công'
            : 'Đặt hàng thành công!'}
        </h1>
        <p className="text-sm text-stone-500">
          {isCancelled
            ? 'Đơn hàng đã được hủy và toàn bộ tồn kho đã được hoàn trả lại cho cửa hàng.'
            : isFailed
            ? 'Đơn hàng tạm giữ tồn kho cho bạn. Bạn có thể thử lại thanh toán hoặc hủy đơn.'
            : 'Mời bạn tới quầy nhận nước khi đơn báo READY'}
        </p>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 text-xs">
          {actionMessage}
        </div>
      )}

      <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 space-y-2">
        <div className="text-xs uppercase tracking-wider text-stone-400 font-bold">Mã đơn hàng</div>
        <div className="text-3xl font-black text-[#1B4332]">#{order.id}</div>
        <div
          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            isCancelled
              ? 'bg-stone-200 text-stone-700'
              : isFailed
              ? 'bg-red-100 text-red-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          Trạng thái: {order.status}
        </div>
      </div>

      {/* Tiến trình Order State Machine nếu không phải trạng thái ngoại lệ */}
      {!isCancelled && !isFailed && (
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
      )}

      {/* Tùy chọn Xử lý khi PAYMENT_FAILED: Thử lại thanh toán hoặc Hủy đơn hoàn kho */}
      {isFailed && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3 text-left">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-amber-700" />
            <span>Tùy chọn xử lý đơn đang chờ thanh toán:</span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleRetryPayment}
              className="flex-1 bg-[#1B4332] hover:bg-[#143325] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Đang xử lý...' : 'Thử lại thanh toán'}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancelOrder}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition disabled:opacity-50"
            >
              {actionLoading ? 'Đang xử lý...' : 'Hủy đơn & Hoàn tồn kho'}
            </button>
          </div>
        </div>
      )}

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
          <span>{isCancelled ? 'Tổng tiền đơn đã hủy' : 'Tổng thanh toán'}</span>
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