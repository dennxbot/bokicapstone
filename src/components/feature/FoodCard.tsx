
import { formatPesoSimple } from '../../lib/currency';
import { useKioskAuth } from '../../hooks/useKioskAuth';

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number;
}

interface FoodCardProps {
  item: FoodItem;
  onAddToCart: (item: FoodItem) => void;
  onViewDetails: (item: FoodItem) => void;
}

export default function FoodCard({ item, onAddToCart, onViewDetails }: FoodCardProps) {
  const { isKioskMode } = useKioskAuth();
  
  return (
    <div className={`bg-white rounded-3xl shadow-lg border border-orange-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${
      isKioskMode ? 'min-h-[400px]' : ''
    }`}>
      <div onClick={() => onViewDetails(item)} className="relative">
        <div className={`overflow-hidden relative ${isKioskMode ? 'aspect-[4/2.5]' : 'aspect-[4/3]'}`}>
          <img
            src={item.image_url || 'https://readdy.ai/api/search-image?query=delicious%20food%20dish%20restaurant%20meal%20appetizing%20colorful%20fresh%20ingredients%20beautifully%20plated%20gourmet%20cuisine%20culinary%20art&width=400&height=300&seq=food-placeholder&orientation=landscape'}
            alt={item.name}
            className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {item.is_featured && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              ⭐ Featured
            </div>
          )}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                Out of Stock
              </div>
            </div>
          )}
        </div>
        <div className={`p-6 ${isKioskMode ? 'pb-4' : ''}`}>
          <div className="flex items-start justify-between mb-3">
            <h3 className={`font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 ${
              isKioskMode ? 'text-xl' : 'text-lg'
            }`}>{item.name}</h3>
            <div className="flex items-center gap-1 text-yellow-400">
              <i className="ri-star-fill text-sm"></i>
              <span className="text-xs text-gray-600 font-medium">4.8</span>
            </div>
          </div>
          <p className={`text-gray-600 mb-4 line-clamp-2 leading-relaxed ${
            isKioskMode ? 'text-base' : 'text-sm'
          }`}>{item.description}</p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent ${
                isKioskMode ? 'text-3xl' : 'text-2xl'
              }`}>
                {formatPesoSimple(item.price)}
              </span>
              <span className="text-xs text-gray-400 line-through">{formatPesoSimple(item.price * 1.2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <i className="ri-time-line"></i>
              <span>{item.preparation_time || 15}-{(item.preparation_time || 15) + 5} min</span>
            </div>
          </div>
        </div>
      </div>
      <div className={`px-6 ${isKioskMode ? 'pb-8' : 'pb-6'}`}>
        <button
          onClick={() => onAddToCart(item)}
          disabled={!item.is_available}
          className={`w-full font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer rounded-xl ${
            isKioskMode ? 'py-4 px-6 text-lg' : 'py-3 px-4'
          } ${
            item.is_available 
              ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {item.is_available ? (
            <>
              <i className={`ri-shopping-cart-line ${isKioskMode ? 'mr-3 text-xl' : 'mr-2'}`} />
              Add to Cart
            </>
          ) : (
            <>
              <i className={`ri-close-circle-line ${isKioskMode ? 'mr-3 text-xl' : 'mr-2'}`} />
              Out of Stock
            </>
          )}
        </button>
      </div>
    </div>
  );
}
