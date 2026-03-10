import { Link } from 'react-router-dom';
import { useCart } from './CartContext';
import type { Product } from './types';

interface CardProps {
  item: Product;
}

function Card({ item }: CardProps) {
  // 1. 直接钩住 Context，获取 addToCart 方法
  const { addToCart } = useCart();

  return (
    <div className="bg-white w-full rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-gray-100 flex flex-col">
      
      {/* 2. 图片区域：用 Link 包裹，点击跳转详情 */}
      <Link to={`/product/${item.id}`} className="block h-[180px] overflow-hidden group cursor-pointer">
        <div 
          className="w-full h-full flex items-center justify-center text-4xl text-white transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundColor: item.color }}
        >
          🖼️
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        {/* 3. 标题区域：也是 Link，点击跳转 */}
        <Link to={`/product/${item.id}`} className="hover:text-blue-600 transition-colors block">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
        </Link>
        
        <p className="text-gray-500 text-sm mb-4 flex-grow">这是 Tailwind 重构后的卡片。</p>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
          <span className="text-red-500 font-bold text-lg">¥ {item.price}</span>
          
          {/* 4. 按钮：完全正常的按钮，不需要 z-index 了，因为没有覆盖层 */}
          <button 
            onClick={(e) => {
                e.preventDefault(); // 防止误触 Link（虽然现在没有嵌套了，保留是个好习惯）
                addToCart(item); 
            }}
            className="px-4 py-2 rounded-lg text-white text-sm bg-gray-800 hover:bg-black active:scale-95 transition-all cursor-pointer"
          >
            加入购物车
          </button>
        </div>
      </div>
    </div>
  );
}

export default Card;