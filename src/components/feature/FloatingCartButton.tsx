import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { formatPesoSimple } from '../../lib/currency';

const FloatingCartButton = () => {
  const navigate = useNavigate();
  const { getTotalItems, getTotalPrice } = useCart();
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  // Don't show the button if cart is empty
  if (totalItems === 0) {
    return null;
  }

  const handleCartClick = () => {
    navigate('/cart', { replace: true });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleCartClick}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 px-6 py-4 min-w-[160px]"
      >
        {/* Cart Icon with Badge */}
        <div className="relative">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z"
            />
          </svg>
          
          {/* Item Count Badge */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
            {totalItems > 99 ? '99+' : totalItems}
          </div>
        </div>

        {/* Cart Info */}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
          <span className="text-lg font-bold">
            {formatPesoSimple(totalPrice)}
          </span>
        </div>

        {/* Arrow Icon */}
        <svg
          className="w-4 h-4 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default FloatingCartButton;