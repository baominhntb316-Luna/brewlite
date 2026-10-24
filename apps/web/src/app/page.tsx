'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { Product } from '@/types';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/mock-data';
import ProductModal from '@/components/ProductModal';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả món' },
  { id: 'COFFEE', label: 'Cà phê Phin & Máy' },
  { id: 'TEA', label: 'Trà Trái Cây & Matcha' },
  { id: 'SIGNATURE', label: 'Signature Đặc Biệt' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const loadProducts = () => {
    setLoading(true);
    setError(null);
    api
      .getProducts()
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải danh sách đồ uống. Vui lòng kiểm tra kết nối API.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B4332] via-[#23533E] to-stone-900 text-white p-5 sm:p-8 md:p-10 shadow-xl">
        <div className="max-w-xl space-y-3 sm:space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trải nghiệm Đặt Cà Phê Không Tiền Mặt</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Đặt món trong vài chạm, nhận nước ngay tại quầy.
          </h1>
          <p className="text-stone-200 text-xs sm:text-sm md:text-base leading-relaxed">
            Không cần xếp hàng chờ đợi. Tùy chỉnh size, topping yêu thích và thanh toán nhanh qua Ví điện tử hoặc Thẻ ngân hàng.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 pt-1 sm:pt-2 text-xs text-stone-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Pha chế trong 3-5 phút
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Thanh toán 100% Cashless
            </span>
          </div>
        </div>
      </section>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition active:scale-95 ${selectedCategory === cat.id
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm Cappuccino, Trà đào..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-[#1B4332]"
          />
        </div>
      </div>

      {/* Lưới Sản Phẩm (Loading / Error State / Empty State / Grid) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl p-4 border border-stone-100 h-80 animate-pulse flex flex-col justify-between"
            >
              <div className="h-44 bg-stone-200 rounded-2xl" />
              <div className="h-4 bg-stone-200 rounded w-2/3" />
              <div className="h-8 bg-stone-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-red-200/80 shadow-xs space-y-3">
          <p className="text-lg font-bold text-red-600">Không thể tải danh sách đồ uống</p>
          <p className="text-sm text-stone-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadProducts}
            className="inline-block px-5 py-2.5 bg-[#1B4332] text-white rounded-2xl text-sm font-semibold hover:bg-[#23533E] transition shadow-xs cursor-pointer active:scale-95"
          >
            Thử lại
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/70">
          <p className="text-lg font-bold text-stone-800">Không tìm thấy đồ uống phù hợp</p>
          <p className="text-sm text-stone-500 mt-1">
            Thử tìm kiếm với từ khóa khác hoặc chọn danh mục Tất cả món.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((product) => (
            <div
              key={product.id}
              onClick={() => setActiveProduct(product)}
              className="group bg-white rounded-3xl p-4 border border-stone-200/70 hover:border-[#1B4332]/40 hover:shadow-xl transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 rounded-2xl overflow-hidden bg-stone-100">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-amber-400 text-stone-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                      {product.badge}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-0.5 rounded-full">
                    Còn {product.stock} ly
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-lg text-stone-900 group-hover:text-[#1B4332] transition">
                    {product.name}
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">Giá từ</span>
                  <span className="text-lg font-extrabold text-[#1B4332]">
                    {formatVND(product.price)}
                  </span>
                </div>
                <button
                  type="button"
                  className="bg-[#1B4332]/10 group-hover:bg-[#1B4332] text-[#1B4332] group-hover:text-white p-2.5 rounded-xl transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal product={activeProduct} onClose={() => setActiveProduct(null)} />
    </div>
  );
}