export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  featured: boolean;
  available: boolean;
}

export interface CartItem extends FoodItem {
  quantity: number;
  size_option_id?: string;
  size_name?: string;
  size_multiplier?: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string | null;
  order_type: 'delivery' | 'pickup';
  payment_method: 'cash' | 'card' | 'online';
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: 'customer' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

// Size management interfaces
export interface SizeOption {
  id: string;
  name: string;
  description?: string;
  price_multiplier: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FoodItemSize {
  id: string;
  food_item_id: string;
  size_option_id: string;
  is_available: boolean;
  custom_price_multiplier?: number;
  created_at: string;
  updated_at: string;
  size_option?: SizeOption; // For joined queries
}

export interface SizeWithPrice {
  id: string;
  size_option_id: string;
  name: string;
  description?: string;
  price_multiplier: number;
  calculated_price: number;
  is_available: boolean;
  sort_order: number;
}

// Extended interfaces to include size information
export interface FoodItemWithSizes extends FoodItem {
  available_sizes?: SizeWithPrice[];
}

export interface CartItemWithSize extends CartItem {
  selected_size?: {
    id: string;
    name: string;
    price_multiplier: number;
  };
}

export interface OrderItemWithSize {
  id: string;
  food_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size_option_id?: string;
  size_name?: string;
  size_multiplier?: number;
  food_item?: FoodItem;
}