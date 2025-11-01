import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { CartItemWithSize, FoodItem, SizeWithPrice } from '../types';

// Helper function to get current user ID
const getCurrentUserId = (): string | null => {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.id;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
};

interface CartStore {
  items: CartItemWithSize[];
  isOpen: boolean;
  lastAddedItem: CartItemWithSize | null;
  
  // Actions
  addItem: (foodItem: FoodItem, selectedSize?: SizeWithPrice, quantity?: number) => void;
  addToCart: (foodItem: FoodItem, selectedSize?: SizeWithPrice, quantity?: number) => void;
  removeItem: (itemId: string, sizeId?: string) => void;
  updateQuantity: (itemId: string, quantity: number, sizeId?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
  createOrder: (orderData?: any) => Promise<void>;
  
  // Database sync functions
  saveCartToDatabase: (userId: string) => Promise<void>;
  loadCartFromDatabase: (userId: string) => Promise<void>;
  clearCartFromDatabase: (userId: string) => Promise<void>;
  syncCartWithDatabase: (userId: string) => Promise<void>;
  
  // Computed values
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (itemId: string, sizeId?: string) => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      lastAddedItem: null,

      addItem: (foodItem: FoodItem, selectedSize?: SizeWithPrice, quantity = 1) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => 
              item.id === foodItem.id && 
              item.selected_size?.id === selectedSize?.id
          );

          let newItems: CartItemWithSize[];
          let addedItem: CartItemWithSize;

          if (existingItemIndex >= 0) {
            // Update existing item quantity
            newItems = [...state.items];
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + quantity,
            };
            addedItem = newItems[existingItemIndex];
          } else {
            // Add new item - use the price from foodItem directly since it's already calculated in food-details page
            const basePrice = foodItem.price;

            addedItem = {
              ...foodItem,
              quantity,
              selected_size: selectedSize ? {
                id: selectedSize.id,
                name: selectedSize.name,
                price_multiplier: selectedSize.price_multiplier,
              } : undefined,
              price: basePrice,
            };

            newItems = [...state.items, addedItem];
          }

          return {
            items: newItems,
            lastAddedItem: addedItem,
          };
        });

        // Sync with database if user is logged in
        const userId = getCurrentUserId();
        if (userId) {
          // Use setTimeout to avoid blocking the UI
          setTimeout(() => {
            get().saveCartToDatabase(userId).catch(console.error);
          }, 0);
        }
      },

      // Alias for addItem to match usage in other components
      addToCart: (foodItem: FoodItem, selectedSize?: SizeWithPrice, quantity = 1) => {
        get().addItem(foodItem, selectedSize, quantity);
      },

      removeItem: (itemId: string, sizeId?: string) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === itemId && item.selected_size?.id === sizeId)
          ),
        }));

        // Sync with database if user is logged in
        const userId = getCurrentUserId();
        if (userId) {
          setTimeout(() => {
            get().saveCartToDatabase(userId).catch(console.error);
          }, 0);
        }
      },

      updateQuantity: (itemId: string, quantity: number, sizeId?: string) => {
        if (quantity <= 0) {
          get().removeItem(itemId, sizeId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId && item.selected_size?.id === sizeId
              ? { ...item, quantity }
              : item
          ),
        }));

        // Sync with database if user is logged in
        const userId = getCurrentUserId();
        if (userId) {
          setTimeout(() => {
            get().saveCartToDatabase(userId).catch(console.error);
          }, 0);
        }
      },

      clearCart: () => {
        set({ items: [], lastAddedItem: null });

        // Clear from database if user is logged in
        const userId = getCurrentUserId();
        if (userId) {
          setTimeout(() => {
            get().clearCartFromDatabase(userId).catch(console.error);
          }, 0);
        }
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      setCartOpen: (isOpen: boolean) => {
        set({ isOpen });
      },

      createOrder: async (orderData?: any) => {
        try {
          console.log('Creating order with data:', orderData);
          
          const cartItems = get().items;
          if (cartItems.length === 0) {
            throw new Error('Cart is empty');
          }

          // Calculate total amount
          const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

          // Create the order in the database
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: orderData?.userId || null,
              customer_name: orderData?.customerName || 'Guest',
              customer_email: orderData?.customerEmail || null,
              customer_phone: orderData?.customerPhone || '',
              customer_address: orderData?.customerAddress || null,
              order_type: orderData?.orderType || 'pickup',
              payment_method: orderData?.paymentMethod || 'cash',
              status: orderData?.status || 'pending',
              total_amount: totalAmount,
              notes: orderData?.notes || null
            })
            .select()
            .single();

          if (orderError) {
            console.error('Error creating order:', orderError);
            throw new Error(`Failed to create order: ${orderError.message}`);
          }

          if (!order) {
            throw new Error('Order creation returned no data');
          }

          // Create order items
          const orderItems = cartItems.map(item => ({
            order_id: order.id,
            food_item_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            size_name: item.size_name || null
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.error('Error creating order items:', itemsError);
            // Try to clean up the order if items creation failed
            await supabase.from('orders').delete().eq('id', order.id);
            throw new Error(`Failed to create order items: ${itemsError.message}`);
          }

          // Clear cart after successful order creation
          get().clearCart();
          
          console.log('Order created successfully:', order);
          return order;
        } catch (error) {
          console.error('Failed to create order:', error);
          throw error;
        }
      },

      // Database sync functions
      saveCartToDatabase: async (userId: string) => {
        try {
          const items = get().items;
          
          // Clear existing cart items for this user first
          await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

          // Insert current cart items if any exist
          if (items.length > 0) {
            const cartItemsToInsert = items.map(item => ({
              user_id: userId,
              food_item_id: item.id,
              quantity: item.quantity,
              size_option_id: item.selected_size?.id || null,
              size_name: item.selected_size?.name || null,
              size_multiplier: item.selected_size?.price_multiplier || 1.0,
              calculated_price: item.price
            }));

            const { error } = await supabase
              .from('cart_items')
              .insert(cartItemsToInsert);

            if (error) {
              console.error('Error saving cart to database:', error);
              throw error;
            }
          }
        } catch (error) {
          console.error('Failed to save cart to database:', error);
        }
      },

      loadCartFromDatabase: async (userId: string) => {
        try {
          const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              food_items (
                id,
                name,
                description,
                price,
                image_url,
                category_id,
                is_available,
                is_featured,
                categories (
                  name
                )
              )
            `)
            .eq('user_id', userId);

          if (error) {
            console.error('Error loading cart from database:', error);
            return;
          }

          if (cartItems && cartItems.length > 0) {
            const loadedItems: CartItemWithSize[] = cartItems.map(dbItem => ({
              id: dbItem.food_items.id,
              name: dbItem.food_items.name,
              description: dbItem.food_items.description,
              price: dbItem.calculated_price,
              image: dbItem.food_items.image_url || '',
              category: dbItem.food_items.categories?.name || '',
              featured: dbItem.food_items.is_featured || false,
              available: dbItem.food_items.is_available || true,
              quantity: dbItem.quantity,
              selected_size: dbItem.size_option_id ? {
                id: dbItem.size_option_id,
                name: dbItem.size_name,
                price_multiplier: dbItem.size_multiplier
              } : undefined
            }));

            set({ items: loadedItems });
          }
        } catch (error) {
          console.error('Failed to load cart from database:', error);
        }
      },

      clearCartFromDatabase: async (userId: string) => {
        try {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

          if (error) {
            console.error('Error clearing cart from database:', error);
          }
        } catch (error) {
          console.error('Failed to clear cart from database:', error);
        }
      },

      syncCartWithDatabase: async (userId: string) => {
        try {
          const localItems = get().items;
          
          // Load items from database
          const { data: dbItems, error } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);

          if (error) {
            console.error('Error syncing cart with database:', error);
            return;
          }

          // If local cart has items but database is empty, save local to database
          if (localItems.length > 0 && (!dbItems || dbItems.length === 0)) {
            await get().saveCartToDatabase(userId);
          }
          // If database has items but local is empty, load from database
          else if ((!localItems || localItems.length === 0) && dbItems && dbItems.length > 0) {
            await get().loadCartFromDatabase(userId);
          }
          // If both have items, merge them (prioritize local items for now)
          else if (localItems.length > 0 && dbItems && dbItems.length > 0) {
            await get().saveCartToDatabase(userId);
          }
        } catch (error) {
          console.error('Failed to sync cart with database:', error);
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          // Use the item price directly since it's already calculated with size adjustments
          return total + (item.price * item.quantity);
        }, 0);
      },

      getItemQuantity: (itemId: string, sizeId?: string) => {
        const item = get().items.find(
          (item) => item.id === itemId && item.selected_size?.id === sizeId
        );
        return item?.quantity || 0;
      },
    }),
    {
      name: 'boki-cart-storage',
      partialize: (state) => ({ 
        items: state.items 
      }),
    }
  )
);

// Hook for cart notifications
export const useCartNotifications = () => {
  const lastAddedItem = useCart((state) => state.lastAddedItem);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (lastAddedItem) {
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
        useCart.setState({ lastAddedItem: null });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [lastAddedItem]);

  return {
    showNotification,
    lastAddedItem,
    hideNotification: () => setShowNotification(false),
  };
};