import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite Coffee - Cashless Ordering',
  description: 'Ứng dụng đặt cà phê không tiền mặt tiện lợi và nhanh chóng',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased selection:bg-amber-200">
        <div className="min-h-screen bg-stone-100 flex flex-col items-center sm:py-6">
          {/* Mobile-first frame container */}
          <div className="w-full max-w-md min-h-screen sm:min-h-[844px] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200/80">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
