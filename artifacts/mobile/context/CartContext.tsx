import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  productId: string;
  priceId: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const MAX_QTY_PER_ITEM = 1;

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      // Anti-hoarding: if already in cart, do NOT increase quantity
      const existing = prev.find((i) => i.priceId === item.priceId);
      if (existing) return prev; // already at max (1)
      return [...prev, { ...item, quantity: MAX_QTY_PER_ITEM }];
    });
  }, []);

  const removeFromCart = useCallback((priceId: string) => {
    setItems((prev) => prev.filter((i) => i.priceId !== priceId));
  }, []);

  const updateQuantity = useCallback((priceId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.priceId !== priceId));
    } else {
      // Hard cap at MAX_QTY_PER_ITEM
      const capped = Math.min(quantity, MAX_QTY_PER_ITEM);
      setItems((prev) =>
        prev.map((i) => (i.priceId === priceId ? { ...i, quantity: capped } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
