import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import { useCart } from './CartContext'; // 引入 Hook
import Cart from './pages/Cart';

function App() {
    // 1. 从 Context 取数据，而不是自己 useState
    const { cartCount } = useCart();

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50 pt-8">
                {/* 导航栏 */}
                <nav className="max-w-5xl mx-auto flex justify-between items-center px-4 mb-8 sticky top-0 bg-gray-50/90 backdrop-blur-sm z-50 py-4">
                    <Link to="/" className="text-3xl font-bold text-gray-900 hover:opacity-80 transition-opacity">
                        React 商店
                    </Link>
                    
                    <Link to="/cart" className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        <span>🛒 购物车</span>
                        {cartCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </nav>

                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;