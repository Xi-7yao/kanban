import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "./types";

interface CartContextType {
    cart: Product[];
    addToCart: (product: Product) => void;
    removeFromCart: (id: number) => void;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<Product[]>(() => {
        const saveCart = localStorage.getItem("my-react-shop-cart");
        return saveCart? JSON.parse(saveCart) : [];
    })

    useEffect(() => {
        localStorage.setItem("my-react-shop-cart", JSON.stringify(cart));
    }, [cart]);


    const addToCart = (product: Product) => {
        setCart([...cart, product]);
    };

    const removeFromCart = (id: number) => {
        setCart((prev) => {
            return prev.filter((item) => item.id != id); 
        })
    }

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, cartCount: cart.length }}>
            { children }
        </CartContext.Provider>
    )
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}