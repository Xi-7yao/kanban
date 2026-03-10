import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { getProductById } from '../api';
import { useCart } from '../CartContext';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            const data = await getProductById(Number(id));
            setProduct(data || null);
        };
        fetchDetail();
    }, [id]);

    if (!product) return <div className='h-full w-full flex justify-center items-center bg-gray-50'>加载中...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center pt-20">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
                <button onClick={() => navigate(-1)} className="mb-4 text-gray-500 hover:text-gray-900">← 返回列表</button>
                
                <div className="h-60 rounded-lg flex items-center justify-center text-8xl text-white mb-6" 
                     style={{ backgroundColor: product.color }}>
                    🖼️
                </div>
                
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
                <p className="text-xl text-gray-600 mb-8">{product.desc || "暂无描述"}</p>
                
                <div className="flex justify-between items-center border-t pt-6">
                    <span className="text-3xl font-bold text-red-500">¥ {product.price}</span>
                    <button 
                        className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-black"
                        onClick={() => {
                            addToCart(product);
                            alert("购买成功！");
                        }}
                    >
                        立即购买
                    </button>
                </div>
            </div>
        </div>
    );
}