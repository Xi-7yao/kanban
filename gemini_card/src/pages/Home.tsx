import { useState } from 'react';
import Card from '../Card';
import { useProduct } from '../hook/useProducts';

export default function Home() {
    const [keyword, setKeyword] = useState<string>('');
    const [onlyCheap, setOnlyCheap] = useState<boolean>(false);
    const { products, isLoading, error } = useProduct();

    const filteredProducts = products.filter(item => {
        const matchKeyword = item.title.toLowerCase().includes(keyword.toLowerCase());
        const matchPrice = onlyCheap ? item.price < 100 : true;
        return matchKeyword && matchPrice;
    });

    return (
        <div className="flex flex-col items-center">
            <div className="flex gap-4 mb-10 mt-8">
                <input 
                    className="p-3 w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="🔍 搜索..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                />
                <button 
                    onClick={() => setOnlyCheap(!onlyCheap)}
                    className={`px-4 py-2 border rounded-lg ${onlyCheap ? 'bg-blue-50 text-blue-600 border-blue-500' : 'bg-white'}`}
                >
                    {onlyCheap ? "只看便宜" : "显示全部"}
                </button>
            </div>

            {isLoading ? (
                <div className="animate-pulse text-gray-500">⏳ 加载中...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl px-4 w-full">
                    {filteredProducts.map(item => (
                        <div key={item.id}>
                            <Card item={item} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}