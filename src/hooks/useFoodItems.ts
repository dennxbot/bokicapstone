
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  created_at: string;
  updated_at: string;
  category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const useFoodItems = () => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates for food_items
    const subscription = supabase
      .channel('food_items_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'food_items' }, 
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchData(); // Refetch data when changes occur
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Starting fetchData in useFoodItems...');

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Categories error:', categoriesError);
        throw categoriesError;
      }
      console.log('✅ Categories fetched:', categoriesData?.length);
      setCategories(categoriesData || []);

      // Fetch ALL food items with category info (don't filter by availability here)
      console.log('🔍 About to query food_items table...');
      console.log('🔐 Current auth state:', supabase.auth.getUser());
      
      const { data: foodItemsData, error: foodItemsError } = await supabase
        .from('food_items')
        .select(`
          *,
          category:categories(name)
        `)
        .order('name');

      console.log('📋 Raw query result:', { data: foodItemsData, error: foodItemsError });

      if (foodItemsError) {
        console.error('❌ Food items error:', foodItemsError);
        throw foodItemsError;
      }
      
      console.log('✅ Fetched food items:', foodItemsData?.length, 'items');
      console.log('📊 Items with availability status:', foodItemsData?.map(item => ({
        name: item.name,
        is_available: item.is_available,
        is_featured: item.is_featured
      })));
      
      setFoodItems(foodItemsData || []);

    } catch (error) {
      console.error('💥 Error fetching data:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchData completed');
    }
  };

  const getFoodItemsByCategory = (categoryId: string) => {
    return foodItems.filter(item => item.category_id === categoryId);
  };

  const getFeaturedItems = () => {
    return foodItems.filter(item => item.is_featured);
  };

  const searchFoodItems = (query: string) => {
    if (!query.trim()) return foodItems;
    
    const searchTerm = query.toLowerCase().trim();
    return foodItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm);
      const descriptionMatch = item.description && item.description.toLowerCase().includes(searchTerm);
      const categoryMatch = item.category?.name && item.category.name.toLowerCase().includes(searchTerm);
      
      return nameMatch || descriptionMatch || categoryMatch;
    });
  };

  const getFoodItemById = (id: string) => {
    return foodItems.find(item => item.id === id);
  };

  return {
    foodItems,
    categories,
    isLoading,
    getFoodItemsByCategory,
    getFeaturedItems,
    searchFoodItems,
    getFoodItemById,
    refetch: fetchData,
  };
};
