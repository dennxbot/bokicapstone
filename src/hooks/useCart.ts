
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { FoodItem, CartItem } from '../types';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Load cart when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('🔍 Loading cart for new user:', user.id);
      loadCartFromDatabase();
    } else {
      console.log('📱 Loading cart from localStorage (no user)');
      loadCartFromLocalStorage();
    }
  }, [user?.id]);

  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        console.log('📱 Loaded from localStorage:', parsedCart);
        setItems(parsedCart);
      } else {
        console.log('📱 No localStorage cart found');
        setItems([]);
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      setItems([]);
    }
  };

  const loadCartFromDatabase = async () => {
    if (!user?.id) {
      console.log('❌ No user ID for database load');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Querying database for user:', user.id);
      
      // 🔍 LOAD CART DEBUG
      console.log('📥 Loading cart from database for user:', user.id);
      
      const { data: cartData, error } = await supabase
        .from('cart_items')
        .select(`
          quantity,
          size_option_id,
          size_name,
          size_multiplier,
          food_items (
            id,
            name,
            price,
            image_url,
            category_id,
            description,
            is_featured,
            is_available,
            preparation_time
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Database query error:', error);
        loadCartFromLocalStorage();
        return;
      }

      console.log('📊 Raw database result:', cartData);

      if (!cartData || cartData.length === 0) {
        console.log('✅ Empty cart for user - checking localStorage for migration');
        // Check if there's a localStorage cart to migrate
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (parsedCart.length > 0) {
            console.log('🔄 Migrating localStorage cart to database:', parsedCart);
            await migrateCartToDatabase(parsedCart);
            return;
          }
        }
        console.log('✅ Setting empty cart for user');
        setItems([]);
        return;
      }

      // Process cart data - NOW USING SIZE COLUMNS FROM DATABASE
      const processedItems: CartItem[] = cartData
        .filter(item => item.food_items) // Filter out items with null food_items
        .map(item => {
          const foodItem = Array.isArray(item.food_items) ? item.food_items[0] : item.food_items;
          
          // Calculate price with size multiplier if available
          const basePrice = foodItem.price;
          const sizeMultiplier = item.size_multiplier || 1;
          const finalPrice = basePrice * sizeMultiplier;
          
          // 🔍 DEBUG: Log each item being processed
          console.log('🔄 Processing cart item:', {
            foodItemName: foodItem.name,
            basePrice: basePrice,
            sizeMultiplier: sizeMultiplier,
            finalPrice: finalPrice,
            sizeName: item.size_name || 'Regular',
            quantity: item.quantity
          });
          
          return {
            id: foodItem.id,
            name: foodItem.name,
            description: foodItem.description || '',
            // Use calculated price with size multiplier
            price: finalPrice,
            image: foodItem.image_url || '',
            category: foodItem.category_id || '',
            featured: foodItem.is_featured || false,
            available: foodItem.is_available || true,
            quantity: item.quantity,
            // Now using size information from database
            size_option_id: item.size_option_id || undefined,
            size_name: item.size_name || undefined,
            size_multiplier: item.size_multiplier || undefined
          };
        });

      console.log('✅ Processed cart items for user:', processedItems);
      console.log('💰 Price verification:', processedItems.map(item => ({
        name: item.name,
        price: item.price,
        note: 'Using original price - size info not available'
      })));
      setItems(processedItems);

    } catch (error) {
      console.error('❌ Error loading cart from database:', error);
      loadCartFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const migrateCartToDatabase = async (localCart: CartItem[]) => {
    if (!user?.id || localCart.length === 0) return;

    try {
      console.log('🔄 Starting cart migration to database');
      
      // Clear any existing cart items for this user first
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      // Insert new cart items
      const cartItemsToInsert = localCart.map(item => ({
        user_id: user.id,
        food_item_id: item.id,
        quantity: item.quantity
      }));

      const { error } = await supabase
        .from('cart_items')
        .insert(cartItemsToInsert);

      if (error) {
        console.error('❌ Migration error:', error);
        return;
      }

      console.log('✅ Cart migrated successfully');
      setItems(localCart);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('cart');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  };

  const saveCartToDatabase = async (cartItems: CartItem[]) => {
    if (!user?.id) {
      console.log('📱 Saving to localStorage (no user)');
      localStorage.setItem('cart', JSON.stringify(cartItems));
      return;
    }

    try {
      console.log('💾 SAVING CART TO DATABASE - Debug Info:');
      console.log('🛒 Cart Items to Save:', cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size_option_id: item.size_option_id,
        size_name: item.size_name,
        size_multiplier: item.size_multiplier
      })));

      // Clear existing cart items for this user
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Error clearing existing cart:', deleteError);
        localStorage.setItem('cart', JSON.stringify(cartItems));
        return;
      }

      if (cartItems.length > 0) {
        // Insert new cart items - NOW INCLUDING SIZE COLUMNS
        const cartItemsToInsert = cartItems.map(item => ({
          user_id: user.id,
          food_item_id: item.id,
          quantity: item.quantity,
          size_option_id: item.size_option_id || null,
          size_name: item.size_name || null,
          size_multiplier: item.size_multiplier || 1
        }));

        console.log('📤 Database Insert Data (with size columns):', cartItemsToInsert);

        const { error } = await supabase
          .from('cart_items')
          .insert(cartItemsToInsert);

        if (error) {
          console.error('❌ Error inserting cart items:', error);
          localStorage.setItem('cart', JSON.stringify(cartItems));
          return;
        }
      }

      console.log('✅ Cart saved to database successfully (with size columns)');
      
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
  };

  const addToCart = async (item: FoodItem | CartItem, quantity: number = 1) => {
    // 🛒 COMPREHENSIVE CART DEBUG LOGGING
    console.log('='.repeat(60));
    console.log('🛒 CART HOOK DEBUG - Adding Item to Cart');
    console.log('='.repeat(60));
    console.log('📦 Received Item:', {
      name: item.name,
      id: item.id,
      price: item.price,
      quantity: quantity
    });
    console.log('🔍 Full Item Data:', item);
    console.log('🏷️ Size Information:', {
      size_option_id: 'size_option_id' in item ? item.size_option_id : 'NOT_PROVIDED',
      size_name: 'size_name' in item ? item.size_name : 'NOT_PROVIDED',
      size_multiplier: 'size_multiplier' in item ? item.size_multiplier : 'NOT_PROVIDED'
    });
    
    // Check if item already exists in cart with same size
    const existingItemIndex = items.findIndex(cartItem => {
      // For items with size information, match both id and size_option_id
      if ('size_option_id' in item && item.size_option_id) {
        return cartItem.id === item.id && cartItem.size_option_id === item.size_option_id;
      }
      // For items without size information, just match id
      return cartItem.id === item.id;
    });
    
    console.log('🔎 Existing Item Check:', {
      existingItemIndex,
      foundExisting: existingItemIndex !== -1,
      currentCartItems: items.length
    });
    
    let newItems: CartItem[];
    
    if (existingItemIndex !== -1) {
      // Update existing item quantity
      newItems = items.map((cartItem, index) =>
        index === existingItemIndex
          ? { ...cartItem, quantity: cartItem.quantity + quantity }
          : cartItem
      );
      console.log('📈 UPDATED EXISTING ITEM - New quantity:', newItems[existingItemIndex].quantity);
    } else {
      // Add new item to cart, preserving all properties including size info and calculated price
      const cartItem: CartItem = {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price, // This will be the calculated price from size selection
        image: 'image' in item ? item.image : (item as any).image_url || '',
        category: 'category' in item ? item.category : (item as any).category_id || '',
        featured: 'featured' in item ? item.featured : (item as any).is_featured || false,
        available: 'available' in item ? item.available : (item as any).is_available || true,
        quantity,
        // Preserve size information if present
        size_option_id: 'size_option_id' in item ? item.size_option_id : undefined,
        size_name: 'size_name' in item ? item.size_name : undefined,
        size_multiplier: 'size_multiplier' in item ? item.size_multiplier : undefined,
      };
      
      console.log('➕ CREATING NEW CART ITEM:');
      console.log('📋 Final Cart Item Object:', cartItem);
      console.log('💰 Final Price in Cart Item:', cartItem.price);
      console.log('🏷️ Final Size Info:', {
        size_option_id: cartItem.size_option_id,
        size_name: cartItem.size_name,
        size_multiplier: cartItem.size_multiplier
      });
      
      newItems = [...items, cartItem];
    }
    
    console.log('📊 NEW CART STATE:');
    console.log('🛒 Total Items:', newItems.length);
    console.log('📝 All Cart Items:', newItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size_name: item.size_name,
      size_option_id: item.size_option_id
    })));
    console.log('='.repeat(60));
    
    // Update state immediately
    setItems(newItems);
    
    // Save to database/localStorage
    await saveCartToDatabase(newItems);
  };

  const removeFromCart = async (itemId: string, sizeOptionId?: string) => {
    console.log('🗑️ Removing from cart:', itemId, 'size:', sizeOptionId);
    
    // Update state immediately - filter by both id and size_option_id if provided
    const newItems = items.filter(item => {
      if (sizeOptionId) {
        return !(item.id === itemId && item.size_option_id === sizeOptionId);
      }
      return item.id !== itemId;
    });
    setItems(newItems);
    
    console.log('✅ Cart after removal:', newItems);
    
    // Remove from database immediately if user is logged in
    if (user?.id) {
      try {
        console.log('🗑️ Deleting from database:', itemId);
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('food_item_id', itemId);

        if (error) {
          console.error('❌ Error deleting from database:', error);
          // If database deletion fails, still keep the local state updated
          // but save the new state to ensure consistency
          await saveCartToDatabase(newItems);
        } else {
          console.log('✅ Successfully deleted from database');
        }
      } catch (error) {
        console.error('❌ Database deletion error:', error);
        // Fallback to full cart save
        await saveCartToDatabase(newItems);
      }
    } else {
      // Save to localStorage for non-logged-in users
      localStorage.setItem('cart', JSON.stringify(newItems));
    }
  };

  const updateQuantity = async (itemId: string, quantity: number, sizeOptionId?: string) => {
    console.log('🔄 Updating quantity for:', itemId, 'to:', quantity, 'size:', sizeOptionId);
    
    if (quantity <= 0) {
      await removeFromCart(itemId, sizeOptionId);
      return;
    }

    const newItems = items.map(item => {
      if (sizeOptionId) {
        return (item.id === itemId && item.size_option_id === sizeOptionId) 
          ? { ...item, quantity } 
          : item;
      }
      return item.id === itemId ? { ...item, quantity } : item;
    });
    
    console.log('✅ Cart after quantity update:', newItems);
    
    // Update state immediately
    setItems(newItems);
    
    // Save to database/localStorage
    await saveCartToDatabase(newItems);
  };

  const clearCart = async () => {
    console.log('🧹 Clearing cart');
    
    // Update state immediately
    setItems([]);
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
          
        if (error) {
          console.error('❌ Error clearing cart from database:', error);
        } else {
          console.log('✅ Cart cleared from database');
        }
      } catch (error) {
        console.error('❌ Error clearing cart from database:', error);
      }
    } else {
      localStorage.removeItem('cart');
      console.log('✅ Cart cleared from localStorage');
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const createOrder = async (orderData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    orderType: 'delivery' | 'pickup';
    paymentMethod: 'cash' | 'card';
    userId: string;
  }) => {
    if (items.length === 0) {
      throw new Error('Cart is empty');
    }

    try {
      console.log('🚀 Starting order creation process...');
      console.log('📦 Cart items:', items.length);
      console.log('💰 Total price:', getTotalPrice());
      console.log('👤 User ID:', orderData.userId);

      // Set user context for RLS
      console.log('🔐 Setting user context for RLS...');
      const { error: contextError } = await supabase.rpc('set_user_context', { 
        user_id: orderData.userId, 
        user_role: user?.role || 'customer'
      });

      if (contextError) {
        console.error('❌ RLS context error:', contextError);
        throw contextError;
      }

      console.log('✅ User context set successfully');

      // Create the order
      console.log('📝 Creating order in database...');
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: orderData.userId,
          customer_name: orderData.customerName,
          customer_email: orderData.customerEmail,
          customer_phone: orderData.customerPhone,
          customer_address: orderData.customerAddress,
          order_type: orderData.orderType,
          payment_method: orderData.paymentMethod,
          status: 'pending',
          total_amount: getTotalPrice(),
          notes: null
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation error:', orderError);
        throw orderError;
      }

      console.log('✅ Order created successfully:', order.id);

      // Create order items with size information
      console.log('📋 Creating order items...');
      const orderItems = items.map(item => ({
        order_id: order.id,
        food_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        size_option_id: item.size_option_id || null,
        size_name: item.size_name || null,
        size_multiplier: item.size_multiplier || null
      }));

      console.log('📋 Order items to insert:', orderItems.length);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ Order items creation error:', itemsError);
        throw itemsError;
      }

      console.log('✅ Order items created successfully');

      // Clear the cart after successful order
      console.log('🧹 Clearing cart...');
      await clearCart();

      // Store order in localStorage for order confirmation page
      console.log('💾 Storing order in localStorage...');
      const orderForStorage = {
        id: order.id,
        items: items,
        total: getTotalPrice(),
        status: 'pending',
        customerInfo: {
          fullName: orderData.customerName,
          contactNumber: orderData.customerPhone,
          email: orderData.customerEmail,
          address: orderData.customerAddress,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod
        },
        createdAt: new Date().toISOString(),
        estimatedTime: orderData.orderType === 'delivery' ? '30-45 minutes' : '15-20 minutes'
      };

      localStorage.setItem('lastOrder', JSON.stringify(orderForStorage));
      console.log('✅ Order stored in localStorage');
      console.log('🎉 Order creation completed successfully!');

      return order;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  };

  return {
    items,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    createOrder,
  };
};
