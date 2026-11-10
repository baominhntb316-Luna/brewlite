import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';

// Nạp font Be Vietnam Pro hỗ trợ 100% tiếng Việt cực đẹp
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BrewLite — Đặt Cà Phê Không Tiền Mặt',
  description: 'Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.className} min-h-screen bg-[#FAF7F2] text-stone-900 antialiased`}>
        <Navbar />
        <CartDrawer />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}