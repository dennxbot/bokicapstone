import { supabase } from './supabase';
import { toast } from 'react-hot-toast';
import type { FoodItem, SizeWithPrice } from '../types';

export interface ReorderResult {
  success: boolean;
  addedItems: number;
  unavailableItems: Array<{
    name: string;
    reason: string;
  }>;
  totalItems: number;
}

export interface OrderItemForReorder {
  id: string;
  food_item_id: string;
  quantity: number;
  unit_price: number;
  size_option_id?: string | null;
  size_name?: string | null;
  size_multiplier?: number | null;
  food_items: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string | null;
    is_available: boolean;
    is_featured: boolean;
    preparation_time: number;
  };
}

/**
 * Fetches order items with food item details for reordering
 */
export async function fetchOrderItemsForReorder(orderId: string): Promise<OrderItemForReorder[]> {
  console.log('Fetching order items for order ID:', orderId);
  
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      id,
      food_item_id,
      quantity,
      unit_price,
      size_option_id,
      size_name,
      size_multiplier,
      food_items (
        id,
        name,
        description,
        price,
        image_url,
        category_id,
        is_available,
        is_featured,
        preparation_time
      )
    `)
    .eq('order_id', orderId);

  if (error) {
    console.error('Error fetching order items:', error);
    throw new Error('Failed to fetch order items');
  }

  console.log('Raw order items data:', JSON.stringify(data, null, 2));
  return (data || []) as unknown as OrderItemForReorder[];
}

/**
 * Fetches available sizes for a food item
 */
export async function fetchAvailableSizes(foodItemId: string): Promise<SizeWithPrice[]> {
  const { data, error } = await supabase
    .from('food_item_sizes')
    .select(`
      id,
      size_option_id,
      is_available,
      custom_price_multiplier,
      size_options (
        id,
        name,
        description,
        price_multiplier,
        sort_order
      )
    `)
    .eq('food_item_id', foodItemId)
    .eq('is_available', true)
    .order('size_option(sort_order)', { ascending: true });

  if (error) {
    console.error('Error fetching sizes:', error);
    return [];
  }

  // Transform the data to match SizeWithPrice interface
  return (data || []).map(item => {
    const sizeOption = (item.size_options as any) as {
      id: string;
      name: string;
      description: string | null;
      price_multiplier: number;
      sort_order: number;
    } | null;

    return {
      id: item.id,
      size_option_id: item.size_option_id,
      name: sizeOption?.name || '',
      description: sizeOption?.description || undefined,
      price_multiplier: item.custom_price_multiplier || sizeOption?.price_multiplier || 1,
      calculated_price: 0, // Will be calculated when needed
      is_available: item.is_available,
      sort_order: sizeOption?.sort_order || 0
    };
  });
}

/**
 * Converts an OrderItemForReorder to a FoodItem
 */
function convertToFoodItem(orderItem: OrderItemForReorder): FoodItem {
  // Check if food_items object exists
  if (!orderItem.food_items) {
    console.error('No food items found for order item:', orderItem);
    throw new Error(`No food item data found for order item ${orderItem.id}`);
  }
  
  const foodItem = orderItem.food_items; // food_items is a single object
  
  console.log('Converting food item:', {
    name: foodItem.name,
    is_available: foodItem.is_available,
    is_available_type: typeof foodItem.is_available,
    full_food_item: foodItem
  });
  
  // Additional check for the food item properties
  if (!foodItem.id || !foodItem.name) {
    console.error('Food item is missing required properties:', orderItem);
    throw new Error(`Food item data is incomplete for order item ${orderItem.id}`);
  }

  // Check if is_available property exists, default to false if missing
  const isAvailable = foodItem.is_available !== undefined ? foodItem.is_available : false;
  
  console.log('Final availability decision:', {
    name: foodItem.name,
    original_is_available: foodItem.is_available,
    final_isAvailable: isAvailable
  });
  
  return {
    id: foodItem.id,
    name: foodItem.name,
    description: foodItem.description || '',
    price: foodItem.price,
    image: foodItem.image_url || `https://readdy.ai/api/search-image?query=delicious%20${foodItem.name}%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${foodItem.id}&orientation=landscape`,
    category: 'Other', // We don't have category name in this query
    featured: foodItem.is_featured || false,
    available: isAvailable
  };
}

/**
 * Main reorder function that processes an order and adds available items to cart
 */
export async function reorderItems(
  orderId: string,
  addToCart: (foodItem: FoodItem, selectedSize?: SizeWithPrice, quantity?: number) => void
): Promise<ReorderResult> {
  const result: ReorderResult = {
    success: false,
    addedItems: 0,
    unavailableItems: [],
    totalItems: 0
  };

  try {
    // Show loading toast
    const loadingToast = toast.loading('Processing your reorder...');

    // Set user context for RLS policies
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        await supabase.rpc('set_user_context', {
          user_id: user.id,
          user_role: user.role
        });
        console.log('User context set for reorder:', { user_id: user.id, user_role: user.role });
      } catch (contextError) {
        console.error('Error setting user context for reorder:', contextError);
      }
    }

    // Fetch order items
    const orderItems = await fetchOrderItemsForReorder(orderId);
    result.totalItems = orderItems.length;

    if (orderItems.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No items found in this order');
      return result;
    }

    // Process each order item
    for (const orderItem of orderItems) {
      const foodItem = convertToFoodItem(orderItem);

      // Debug logging
      console.log('Processing order item:', {
        name: foodItem.name,
        available: foodItem.available,
        is_available_from_db: orderItem.food_items.is_available,
        orderItem: orderItem
      });

      // Check if the main item is available
      if (!foodItem.available) {
        console.log('Item marked as unavailable:', foodItem.name, 'is_available:', orderItem.food_items.is_available);
        result.unavailableItems.push({
          name: foodItem.name,
          reason: 'Currently out of stock'
        });
        continue;
      }

      // Handle size selection if the original order had a size
      let selectedSize: SizeWithPrice | undefined;
      
      if (orderItem.size_option_id) {
        console.log('Order item has size_option_id:', orderItem.size_option_id);
        
        // Fetch available sizes for this item
        const availableSizes = await fetchAvailableSizes(foodItem.id);
        console.log('Available sizes for', foodItem.name, ':', availableSizes);
        
        // Try to find the same size that was ordered
        const matchedSize = availableSizes.find(size => 
          size.size_option_id === orderItem.size_option_id
        );
        
        console.log('Matched size found:', matchedSize);
        
        if (!matchedSize) {
          // The specific size is no longer available
          console.log('Size not found! Looking for size ID:', orderItem.size_option_id, 'in available sizes:', availableSizes.map(s => ({ size_option_id: s.size_option_id, name: s.name })));
          result.unavailableItems.push({
            name: `${foodItem.name} (${orderItem.size_name || 'Unknown Size'})`,
            reason: 'Size no longer available'
          });
          continue;
        }
        
        // Create selectedSize object following useCart's pattern
        // Only store the essential fields that useCart uses
        selectedSize = {
          id: matchedSize.id, // food_item_sizes table ID (used by useCart for item identification)
          size_option_id: matchedSize.size_option_id, // size_options table ID (used for database storage)
          name: matchedSize.name,
          description: matchedSize.description,
          price_multiplier: matchedSize.price_multiplier,
          calculated_price: foodItem.price * matchedSize.price_multiplier,
          is_available: matchedSize.is_available,
          sort_order: matchedSize.sort_order
        };
        
        // Update foodItem price to include size adjustment for useCart
        foodItem.price = foodItem.price * matchedSize.price_multiplier;
        
        console.log('Selected size prepared for useCart:', {
          id: selectedSize.id,
          size_option_id: selectedSize.size_option_id,
          name: selectedSize.name,
          price_multiplier: selectedSize.price_multiplier,
          adjustedPrice: foodItem.price
        });
      }

      // Add item to cart using the same pattern as useCart
      try {
        console.log('Attempting to add to cart:', {
          foodItem: foodItem.name,
          foodItemPrice: foodItem.price,
          selectedSize: selectedSize ? { 
            id: selectedSize.id, 
            size_option_id: selectedSize.size_option_id,
            name: selectedSize.name,
            price_multiplier: selectedSize.price_multiplier
          } : null,
          quantity: orderItem.quantity
        });
        
        // Call addToCart with the same signature as useCart expects
        addToCart(foodItem, selectedSize, orderItem.quantity);
        result.addedItems++;
        console.log('Successfully added to cart:', foodItem.name);
      } catch (error) {
        console.error('Error adding item to cart:', error);
        result.unavailableItems.push({
          name: foodItem.name,
          reason: 'Failed to add to cart'
        });
      }
    }

    toast.dismiss(loadingToast);

    // Show result notifications
    if (result.addedItems > 0) {
      toast.success(`${result.addedItems} item${result.addedItems > 1 ? 's' : ''} added to cart!`);
      result.success = true;
    }

    if (result.unavailableItems.length > 0) {
      const unavailableCount = result.unavailableItems.length;
      toast.error(
        `${unavailableCount} item${unavailableCount > 1 ? 's' : ''} ${unavailableCount > 1 ? 'are' : 'is'} no longer available`,
        { duration: 4000 }
      );
    }

    if (result.addedItems === 0) {
      toast.error('No items could be added to cart');
    }

  } catch (error) {
    console.error('Error during reorder:', error);
    toast.error('Failed to process reorder. Please try again.');
  }

  return result;
}

/**
 * Shows detailed unavailable items information
 */
export function showUnavailableItemsDetails(unavailableItems: ReorderResult['unavailableItems']) {
  if (unavailableItems.length === 0) return;

  const details = unavailableItems
    .map(item => `• ${item.name}: ${item.reason}`)
    .join('\n');
    
  toast.error(
    `Unavailable items:\n${details}`,
    { 
      duration: 6000,
      style: {
        whiteSpace: 'pre-line',
        textAlign: 'left'
      }
    }
  );
}