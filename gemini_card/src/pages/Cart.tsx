import { useCart } from '../CartContext';
import { Link } from 'react-router-dom';

export default function Cart() {
  const { cart, removeFromCart } = useCart();

  // 1. 计算总价 (reduce 是数组求和的神器)
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-xl mb-6">购物车空空如也</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          去逛逛
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">我的购物车 ({cart.length})</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 商品列表 */}
        {cart.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center p-4 border-b last:border-b-0 hover:bg-gray-50">
            {/* 小图 */}
            <div className="w-20 h-20 rounded-lg flex items-center justify-center text-2xl text-white shrink-0" 
                 style={{ backgroundColor: item.color }}>
              🖼️
            </div>
            
            {/* 信息 */}
            <div className="ml-4 flex-grow">
              <h3 className="font-bold text-gray-800">{item.title}</h3>
              <p className="text-gray-500 text-sm">¥ {item.price}</p>
            </div>

            {/* 删除按钮 */}
            <button 
              onClick={() => removeFromCart(item.id)}
              className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1"
            >
              删除
            </button>
          </div>
        ))}
      </div>

      {/* 底部结算栏 */}
      <div className="mt-8 flex justify-end items-center gap-6">
        <div className="text-right">
          <p className="text-gray-500">总计金额</p>
          <p className="text-3xl font-bold text-red-600">¥ {totalPrice}</p>
        </div>
        <button 
            onClick={() => alert(`模拟支付 ${totalPrice} 元成功！`)}
            className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black shadow-lg active:scale-95 transition-all"
        >
          去结算
        </button>
      </div>
    </div>
  );
}