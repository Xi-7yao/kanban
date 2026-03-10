import { useEffect, useState } from "react";
import type { Product } from "../types";
import { getProducts } from "../api";

export function useProduct() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getProducts();
                setProducts(data);
                setIsLoading(false);
            } catch(err) {
                setError("加载失败");
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);
    return { products, isLoading, error };
}