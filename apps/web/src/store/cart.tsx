import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface CartItem {
  productId: number;
  brand: string;
  model: string;
  priceArs: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx>(null as any);
const KEY = 'gp_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add: CartCtx['add'] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === item.productId);
      if (found) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const remove = (productId: number) =>
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  const setQty = (productId: number, qty: number) =>
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.priceArs * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, total, count }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
