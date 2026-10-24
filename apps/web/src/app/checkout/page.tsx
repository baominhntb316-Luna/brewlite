'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, CreditCard, Tag, AlertCircle, ShieldCheck, Sparkles, QrCode, X, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PaymentMethod } from '@/types';
import { formatVND } from '@/lib/mock-data';
import { api } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    promoCode,
    applyPromo,
    getSubtotal,
    getDiscountAmount,
    getFinalTotal,
    clearCart,
  } = useCartStore();
  const { user, token, addLoyaltyPoints } = useAuthStore();

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [promoInput, setPromoInput] = useState(promoCode || '');
  const [promoMessage, setPromoMessage] = useState('');
  const [simulateFail, setSimulateFail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoomQR, setZoomQR] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | number | null>(null);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Sinh Idempotency-Key duy nhất cho phiên thanh toán (Task 10)
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    // Khi vào trang checkout hoặc giỏ hàng thay đổi, reset đơn chờ và sinh idempotency key mới
    setPendingOrderId(null);
    setError('');
    setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  }, [items]);

  if (!user || !token) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Bạn cần đăng nhập để đặt đơn</h2>
        <p className="text-sm text-stone-500">
          Vui lòng đăng nhập tài khoản để tích điểm thưởng và thanh toán không tiền mặt.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#1B4332] text-white font-semibold px-6 py-3 rounded-2xl"
        >
          Đến trang Đăng nhập
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-4">
        <h2 className="text-xl font-bold">Giỏ hàng của bạn đang trống</h2>
        <Link
          href="/"
          className="inline-block bg-[#1B4332] text-white font-semibold px-6 py-3 rounded-2xl"
        >
          Quay lại chọn đồ uống
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = getFinalTotal();
  const earnedPoints = Math.floor(total / 10000);

  const handleApplyPromo = () => {
    const res = applyPromo(promoInput);
    setPromoMessage(res.message);
  };

  const handleCancelPendingOrder = async () => {
    if (!pendingOrderId) return;
    setLoading(true);
    try {
      await api.updateOrderStatus(pendingOrderId, 'CANCELLED', token);
      setPendingOrderId(null);
      setError('Đơn hàng đã được hủy thành công và tồn kho đã được hoàn trả lại.');
    } catch (err: any) {
      setError(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setLoading(false);
    }
  };


  const handlePayment = async () => {
    setLoading(true);
    setError('');
    setModalError('');
    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        // Bước 1: Gọi POST /orders tạo đơn PENDING (tạm giữ tồn kho)
        const order = await api.createOrder(items, subtotal, discount, total, token, promoCode || undefined);
        orderId = order.id;
        setPendingOrderId(order.id);
      }

      // D-09: Giữ nguyên Idempotency-Key cho cùng phiên thanh toán của đơn hàng (chống lặp do double-click / lag mạng)
      let currentKey = idempotencyKey;
      if (!currentKey) {
        currentKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setIdempotencyKey(currentKey);
      }

      // Bước 2: Gọi POST /payments kèm Idempotency-Key
      await api.payOrder(orderId, method, currentKey, simulateFail, token);
      // Bước 3: Cộng điểm thưởng & xóa giỏ hàng khi PAID
      addLoyaltyPoints(earnedPoints);
      clearCart();
      setPendingOrderId(null);
      setError('');
      setShowFailedModal(false);
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      // US-05: Nếu thanh toán lỗi, giỏ hàng được giữ nguyên!
      const errorMsg = err.message || 'Thanh toán thất bại, vui lòng thử lại.';
      setError(errorMsg);
      // Hiển thị modal thông báo lỗi thanh toán theo yêu cầu
      setShowFailedModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleModalRetryPayment = async () => {
    if (!pendingOrderId) return;
    setModalLoading(true);
    setModalError('');
    try {
      // Lượt thử thanh toán mới cho đơn đã thất bại sinh key retry mới
      const retryKey = `idem_retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setIdempotencyKey(retryKey);
      // Tự động bỏ cờ mô phỏng lỗi để thử lại thanh toán thành công
      setSimulateFail(false);
      await api.payOrder(pendingOrderId, method, retryKey, false, token);
      addLoyaltyPoints(earnedPoints);
      clearCart();
      const finalId = pendingOrderId;
      setPendingOrderId(null);
      setShowFailedModal(false);
      router.push(`/orders/${finalId}`);
    } catch (err: any) {
      setModalError(err.message || 'Thanh toán thất bại, vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalCancelOrder = async () => {
    if (!pendingOrderId) return;
    setModalLoading(true);
    setModalError('');
    try {
      await api.updateOrderStatus(pendingOrderId, 'CANCELLED', token);
      setPendingOrderId(null);
      setShowFailedModal(false);
      setError('Đơn hàng đã được hủy thành công và tồn kho đã được hoàn trả lại.');
    } catch (err: any) {
      setModalError(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Cột trái: Phương thức thanh toán */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 space-y-4">
          <h2 className="text-xl font-bold text-stone-900">
            Phương thức thanh toán (Không tiền mặt)
          </h2>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMethod('WALLET')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition ${method === 'WALLET'
                  ? 'border-[#1B4332] bg-[#1B4332]/5'
                  : 'border-stone-200 hover:border-stone-300'
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Ví điện tử (MoMo / VNPay)</div>
                  <div className="text-xs text-stone-500">Quét mã hoặc xác nhận nhanh 1 chạm</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 ${method === 'WALLET' ? 'border-[#1B4332] bg-[#1B4332]' : 'border-stone-300'
                  }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setMethod('CARD')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition ${method === 'CARD'
                  ? 'border-[#1B4332] bg-[#1B4332]/5'
                  : 'border-stone-200 hover:border-stone-300'
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Thẻ ngân hàng (ATM / Visa / Master)</div>
                  <div className="text-xs text-stone-500">Bảo mật chuẩn cổng thanh toán</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 ${method === 'CARD' ? 'border-[#1B4332] bg-[#1B4332]' : 'border-stone-300'
                  }`}
              />
            </button>
          </div>

          {/* Khối quét mã QR thanh toán theo phương thức đã chọn */}
          <div className="mt-4 p-5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#1B4332]" />
                <span className="font-bold text-sm text-stone-900">
                  {method === 'WALLET' ? 'Quét mã MoMo để thanh toán' : 'Quét mã VietQR Ngân hàng'}
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1B4332]">
                Tự động quét & khớp đơn
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div
                onClick={() => setZoomQR(true)}
                title="Nhấn để phóng to mã QR"
                className="relative group shrink-0 w-44 h-44 bg-white p-2 rounded-2xl border-2 border-stone-200 shadow-sm overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#1B4332] transition"
              >
                <img
                  src={method === 'WALLET' ? '/QR_MOMO.jpg' : '/QR_BANK.jpg'}
                  alt={method === 'WALLET' ? 'Mã QR MoMo' : 'Mã QR Ngân Hàng'}
                  className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold rounded-xl">
                  🔍 Nhấn phóng to
                </div>
              </div>

              <div className="space-y-2 text-xs text-stone-600 flex-1 w-full">
                <div className="p-3 bg-white rounded-xl border border-stone-200/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Số tiền:</span>
                    <strong className="text-stone-900 text-sm text-[#1B4332] font-black">{formatVND(total)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Nội dung CK:</span>
                    <strong className="text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                      BREWLITE {idempotencyKey.slice(0, 8).toUpperCase()}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Phương thức:</span>
                    <span className="font-semibold text-stone-700">
                      {method === 'WALLET' ? 'Ví điện tử MoMo' : 'VietQR / Thẻ liên ngân hàng'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 italic">
                  💡 Sau khi quét mã thanh toán trên điện thoại, bấm nút <strong>&quot;Xác nhận trả {formatVND(total)}&quot;</strong> bên cạnh để hoàn tất đơn hàng.
                </p>
              </div>
            </div>
          </div>

          {/* Công tắc hỗ trợ Demo kịch bản lỗi thanh toán US-05 cho giảng viên */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>Chế độ Demo: Mô phỏng lỗi thanh toán (PAYMENT_FAILED)</span>
            <input
              type="checkbox"
              checked={simulateFail}
              onChange={(e) => setSimulateFail(e.target.checked)}
              className="w-4 h-4 accent-[#1B4332]"
            />
          </div>
        </div>

        {/* Khuyến mãi Task 10 */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 space-y-3">
          <label className="block text-sm font-bold text-stone-900">
            Mã khuyến mãi (Thử nhập: <code className="text-[#1B4332]">BREWLITE10</code> hoặc{' '}
            <code className="text-[#1B4332]">SGU2026</code>)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Nhập mã giảm giá..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm uppercase"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800"
            >
              Áp dụng
            </button>
          </div>
          {promoMessage && (
            <p className="text-xs font-medium text-[#1B4332]">{promoMessage}</p>
          )}
        </div>
      </div>

      {/* Cột phải: Tóm tắt đơn hàng */}
      <div className="lg:col-span-5">
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 space-y-5 sticky top-24">
          <h3 className="text-lg font-bold text-stone-900">Tóm tắt đơn hàng</h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between text-sm">
                <div>
                  <span className="font-semibold text-stone-800">
                    {item.product.name} ({item.size}) x{item.qty}
                  </span>
                  {item.toppings.length > 0 && (
                    <p className="text-xs text-stone-500">
                      +{item.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-stone-900">
                  {formatVND(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Tạm tính</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Giảm giá khuyến mãi</span>
                <span>-{formatVND(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-extrabold text-stone-900 pt-2 border-t border-stone-100">
              <span>Tổng thanh toán</span>
              <span className="text-[#1B4332]">{formatVND(total)}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Bạn sẽ nhận thêm <strong>+{earnedPoints} điểm tích lũy</strong> sau khi thanh toán thành công.
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {pendingOrderId && (
                <div className="flex items-center justify-between pt-1.5 border-t border-red-200/60 text-[11px]">
                  <span>Đơn #{pendingOrderId} đang tạm giữ tồn kho.</span>
                  <button
                    type="button"
                    onClick={handleCancelPendingOrder}
                    disabled={loading}
                    className="font-bold underline text-red-800 hover:text-red-950 transition"
                  >
                    Hủy đơn & hoàn kho
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handlePayment}
            className="w-full bg-[#1B4332] hover:bg-[#143325] text-white font-bold py-4 rounded-2xl shadow-lg transition disabled:opacity-50"
          >
            {loading
              ? 'Đang xử lý giao dịch...'
              : pendingOrderId
                ? `Thử lại thanh toán đơn #${pendingOrderId} (${formatVND(total)})`
                : `Xác nhận trả ${formatVND(total)}`}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Idempotency-Key: {idempotencyKey}</span>
          </div>
        </div>
      </div>

      {/* Modal phóng to mã QR thanh toán */}
      {zoomQR && (
        <div
          onClick={() => setZoomQR(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-stone-200 text-center relative"
          >
            <button
              onClick={() => setZoomQR(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-stone-900 pt-1">
              {method === 'WALLET' ? 'Mã QR MoMo' : 'Mã VietQR Ngân hàng'}
            </h3>
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <img
                src={method === 'WALLET' ? '/QR_MOMO.jpg' : '/QR_BANK.jpg'}
                alt="QR Code Zoom"
                className="w-full h-auto rounded-xl mx-auto max-h-[60vh] object-contain"
              />
            </div>
            <div className="text-xs text-stone-600 space-y-1">
              <p>Số tiền: <strong className="text-[#1B4332] text-sm">{formatVND(total)}</strong></p>
              <p className="text-stone-400 font-mono text-[11px]">Nội dung: BREWLITE {idempotencyKey.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thanh toán chưa thành công với tùy chọn xử lý (Task 10 & Mô phỏng lỗi) */}
      {showFailedModal && (
        <div
          onClick={() => setShowFailedModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl border border-stone-200 text-center relative"
          >
            <button
              onClick={() => setShowFailedModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon lỗi nổi bật */}
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-9 h-9" />
            </div>

            {/* Tiêu đề & mô tả */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-stone-900">
                Thanh toán chưa thành công
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Đơn hàng tạm giữ tồn kho cho bạn. Bạn có thể thử lại thanh toán hoặc hủy đơn để hoàn trả lại kho.
              </p>
            </div>

            {/* Thẻ tóm tắt thông tin đơn hàng */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2 text-left text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-stone-900 text-sm">#{pendingOrderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Số tiền:</span>
                <span className="font-extrabold text-[#1B4332] text-sm">{formatVND(total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Phương thức:</span>
                <span className="font-medium text-stone-700">
                  {method === 'WALLET' ? 'Ví điện tử (MoMo / VNPay)' : 'Thẻ ATM / Thẻ quốc tế'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                <span className="text-stone-500">Trạng thái:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                  PAYMENT_FAILED
                </span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-left">
                {modalError}
              </div>
            )}

            {/* Khung tùy chọn xử lý đơn hàng */}
            <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3 text-left">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                <span>Tùy chọn xử lý đơn đang chờ thanh toán:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={handleModalRetryPayment}
                  className="flex-1 bg-[#1B4332] hover:bg-[#143325] text-white text-xs font-bold py-3 px-3 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${modalLoading ? 'animate-spin' : ''}`} />
                  <span>{modalLoading ? 'Đang xử lý...' : 'Thử lại thanh toán'}</span>
                </button>
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={handleModalCancelOrder}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 px-3 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{modalLoading ? 'Đang xử lý...' : 'Hủy đơn & Hoàn tồn kho'}</span>
                </button>
              </div>
            </div>

            {pendingOrderId && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowFailedModal(false);
                    router.push(`/orders/${pendingOrderId}`);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 underline font-medium"
                >
                  Xem trang chi tiết đơn #{pendingOrderId}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}