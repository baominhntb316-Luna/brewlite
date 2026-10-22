'use client';

import Link from 'next/link';
import { Coffee, ShoppingBag, User as UserIcon, History, LogOut, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const { openCart, getTotalCount } = useCartStore();
  const { user, logout } = useAuthStore();
  const count = getTotalCount();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF7F2]/85 border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#1B4332] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-stone-900">BrewLite</span>
            <span className="block text-[10px] uppercase tracking-widest text-[#1B4332] font-semibold">
              Cashless Coffee
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-100/80 text-amber-900 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{user.loyaltyPoints} điểm thưởng</span>
            </div>
          )}

          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-200/60 transition"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Đơn hàng</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-800 hidden md:inline">
                Chào, {user.name}
              </span>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-2 rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-stone-800 hover:bg-stone-200/70 transition"
            >
              <UserIcon className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>
          )}

          <button
            onClick={openCart}
            className="relative flex items-center gap-2 bg-[#1B4332] hover:bg-[#143325] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Giỏ hàng</span>
            {count > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-400 text-stone-950">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}