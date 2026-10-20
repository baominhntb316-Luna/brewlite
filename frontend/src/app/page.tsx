export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-800 text-white flex items-center justify-center text-3xl shadow-lg mb-4">
        ☕
      </div>
      <h1 className="text-2xl font-bold text-stone-900 mb-2">
        BrewLite Coffee
      </h1>
      <p className="text-sm text-stone-600 mb-6 font-medium">
        Ứng dụng đặt cà phê không dùng tiền mặt (Cashless Coffee)
      </p>
      
      <div className="w-full max-w-xs p-4 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-700">
        <p className="font-semibold text-emerald-700 mb-1">
          ✓ Hello World!
        </p>
        <p className="text-stone-500">
          Khung dự án (Next.js & NestJS) đã khởi tạo thành công (Task 1).
        </p>
      </div>
    </main>
  );
}
