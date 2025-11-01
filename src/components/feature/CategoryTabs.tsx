interface Category {
  id: string;
  name: string;
}

interface FoodItem {
  id: string;
  category_id: string | null;
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  foodItems: FoodItem[];
}

interface CategoryButtonProps {
  id: string;
  name: string;
  count: number;
  icon?: string;
}

const CategoryTabs = ({ categories, selectedCategory, setSelectedCategory, foodItems }: CategoryTabsProps) => { 
  // Helper component for each category tab 
  const CategoryButton = ({ id, name, count, icon }: CategoryButtonProps) => { 
    const active = selectedCategory === id; 

    return ( 
      <button 
        onClick={() => setSelectedCategory(id)} 
        aria-pressed={active} 
        className={`flex items-center justify-center flex-shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium transition-all duration-300 whitespace-nowrap text-sm sm:text-base ${ 
          active 
            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg ring-2 ring-orange-400/40" 
            : "bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50" 
        }`} 
      > 
        {icon && <i className={`${icon} mr-2`}></i>} 
        {name} 
        <span 
          className={`ml-2 text-xs ${ 
            active ? "opacity-80 text-white/80" : "opacity-70 text-gray-500" 
          }`} 
        > 
          ({count}) 
        </span> 
      </button> 
    ); 
  }; 

  return ( 
    <nav 
      role="tablist" 
      className="flex overflow-x-auto scrollbar-hide pb-2 px-1 gap-3" 
    > 
      {/* All Items Button */} 
      <CategoryButton 
        id="all" 
        name="All Items" 
        icon="ri-apps-2-line" 
        count={foodItems.length} 
      /> 

      {/* Dynamic Category Buttons */} 
      {categories.map((category) => ( 
        <CategoryButton 
          key={category.id} 
          id={category.id} 
          name={category.name} 
          icon={undefined}
          count={ 
            foodItems.filter((item) => item.category_id === category.id).length 
          } 
        /> 
      ))} 
    </nav> 
  ); 
}; 

export default CategoryTabs;