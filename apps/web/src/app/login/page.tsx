'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Validate cơ bản ở phía Frontend
      if (password.length < 6) {
        throw new Error('Mật khẩu phải có tối thiểu 6 ký tự');
      }

      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }

        // 1. Gọi API Đăng ký: POST /auth/register
        const regRes = await api.register(email, password);

        // Nếu backend trả về luôn accessToken & user sau khi đăng ký
        if (regRes?.accessToken && regRes?.user) {
          loginSuccess(regRes.user, regRes.accessToken);
          router.push('/checkout');
          return;
        }

        // Nếu backend chỉ trả về thông tin user vừa tạo -> tự động gọi tiếp login để lấy JWT
        const loginRes = await api.login(email, password);
        loginSuccess(loginRes.user, loginRes.accessToken);
        router.push('/checkout');
      } else {
        // 2. Gọi API Đăng nhập: POST /auth/login
        const res = await api.login(email, password);
        loginSuccess(res.user, res.accessToken);
        router.push('/checkout');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccessMsg('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-md mx-auto mt-8 bg-white p-8 rounded-3xl border border-stone-200/80 shadow-lg">
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center mx-auto">
          <Coffee className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">
          {isRegister ? 'Tạo tài khoản BrewLite' : 'Đăng nhập BrewLite'}
        </h1>
        <p className="text-xs text-stone-500">
          Tích điểm thưởng và thanh toán không tiền mặt nhanh chóng
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-stone-600 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn (VD: sinhvien@sgu.edu.vn)"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-stone-600 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>

        {/* Hiển thị thêm ô Xác nhận mật khẩu khi đang ở chế độ Đăng ký */}
        {isRegister && (
          <div>
            <label className="block text-xs font-bold uppercase text-stone-600 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B4332] hover:bg-[#143325] text-white font-semibold py-3.5 rounded-2xl shadow-md transition disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-xs font-semibold text-[#1B4332] hover:underline"
        >
          {isRegister
            ? 'Đã có tài khoản? Đăng nhập'
            : 'Chưa có tài khoản? Đăng ký miễn phí'}
        </button>
      </div>
    </div>
  );
}