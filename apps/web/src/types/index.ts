export type DrinkSize = 'S' | 'M' | 'L';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

export type PaymentMethod = 'WALLET' | 'CARD';

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'COFFEE' | 'TEA' | 'SIGNATURE' | 'PASTRY';
  price: number;
  imageUrl: string;
  stock: number;
  badge?: string;
}

export interface CartItem {
  cartItemId: string; // ID duy nhất kết hợp từ productId + size + toppings
  product: Product;
  size: DrinkSize;
  toppings: Topping[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}