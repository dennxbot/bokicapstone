import { useCartNotifications } from '../../hooks/useCart';
import { formatPesoSimple } from '../../lib/currency';

const CartNotification = () => {
  const { showNotification, lastAddedItem, hideNotification } = useCartNotifications();

  if (!showNotification || !lastAddedItem) {
    return null;
  }

  // Price is already calculated in the food-details page, no need to multiply again
  const itemPrice = lastAddedItem.price;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 max-w-sm flex items-center space-x-3 animate-pulse">
        {/* Success Icon */}
        <div className="flex-shrink-0">
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Added to cart!</p>
          <p className="text-xs opacity-90 truncate">
            {lastAddedItem.name}
            {lastAddedItem.selected_size && (
              <span className="ml-1">({lastAddedItem.selected_size.name})</span>
            )}
          </p>
          <p className="text-xs opacity-90">
            Qty: {lastAddedItem.quantity} × {formatPesoSimple(itemPrice)}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={hideNotification}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CartNotification;