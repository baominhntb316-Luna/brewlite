import { Product, Topping } from '@/types';

export const SIZE_OPTIONS = [
  { label: 'Size S (Nhỏ)', value: 'S' as const, priceDelta: 0 },
  { label: 'Size M (Vừa)', value: 'M' as const, priceDelta: 6000 },
  { label: 'Size L (Lớn)', value: 'L' as const, priceDelta: 12000 },
];

export const TOPPING_OPTIONS: Topping[] = [
  { id: 'tp-pearl', name: 'Trân châu hoàng kim', price: 8000 },
  { id: 'tp-cream', name: 'Kem Macchiato phô mai', price: 12000 },
  { id: 'tp-shot', name: 'Thêm 1 Shot Espresso', price: 10000 },
  { id: 'tp-jelly', name: 'Thạch cà phê giòn', price: 8000 },
];

export const PROMO_CODES: Record<string, { discountPercent: number; description: string }> = {
  BREWLITE10: { discountPercent: 10, description: 'Giảm 10% tổng hóa đơn' },
  SGU2026: { discountPercent: 20, description: 'Ưu đãi ĐH Sài Gòn - Giảm 20%' },
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Cà Phê Sữa Đá Sài Gòn',
    description: 'Hạt Robusta rang đậm pha phin truyền thống kết hợp sữa đặc béo ngậy.',
    category: 'COFFEE',
    price: 35000,
    imageUrl: '/ca-phe-sua.jpg',
    stock: 25,
    badge: 'Bán chạy #1',
  },
  {
    id: 'prod-2',
    name: 'Classic Americano Đá',
    description: '100% hạt Arabica Cầu Đất, vị chua thanh nhẹ và hậu vị ngọt sâu.',
    category: 'COFFEE',
    price: 40000,
    imageUrl: '/americano.jpg',
    stock: 30,
  },
  {
    id: 'prod-3',
    name: 'Artisan Cappuccino',
    description: 'Sự cân bằng hoàn hảo giữa Espresso đậm đà và lớp bọt sữa mịn màng.',
    category: 'COFFEE',
    price: 45000,
    imageUrl: '/cappuccino.jpg',
    stock: 18,
    badge: 'Yêu thích',
  },
  {
    id: 'prod-4',
    name: 'Trà Đào Cam Sả',
    description: 'Trà đen ủ lạnh hòa quyện cùng đào miếng giòn ngọt, cam vàng và hương sả.',
    category: 'TEA',
    price: 39000,
    imageUrl: '/tra-dao.jpg',
    stock: 20,
    badge: 'Mát lạnh',
  },
  {
    id: 'prod-5',
    name: 'Caramel Salt Cold Brew',
    description: 'Cà phê ủ lạnh 18 giờ êm mượt, phủ lớp kem muối biển caramel.',
    category: 'SIGNATURE',
    price: 52000,
    imageUrl: '/ca-phe-sua.jpg',
    stock: 10,
    badge: 'Signature',
  },
  {
    id: 'prod-6',
    name: 'Matcha Latte Uji Nhật Bản',
    description: 'Bột trà xanh Uji thượng hạng đánh bông cùng sữa tươi thanh trùng.',
    category: 'TEA',
    price: 49000,
    imageUrl: '/tra-dao.jpg',
    stock: 15,
  },
];

export const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);