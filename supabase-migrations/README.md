# BOKI Food Ordering System - Database Migrations

This directory contains the complete database schema and migrations for the BOKI food ordering system.

## Migration Files

### 01_initial_schema.sql
Creates the core database structure including:
- **Users table**: Customer and admin user management
- **Categories table**: Food item categories
- **Food items table**: Menu items with pricing and availability
- **Orders table**: Customer orders with status tracking
- **Order items table**: Individual items within orders
- **Cart items table**: Persistent shopping cart storage
- **Order status history table**: Audit trail for order status changes

### 02_rls_policies.sql
Implements Row Level Security (RLS) policies for:
- User data privacy (users can only see their own data)
- Admin access controls (admins can manage all data)
- Public access to available food items and categories
- Secure cart and order management

### 03_functions_and_triggers.sql
Creates database functions and triggers for:
- Automatic order status history tracking
- Order total calculation from order items
- Order item total validation
- Business analytics functions (sales statistics, top selling items)
- Data maintenance functions

### 04_sample_data.sql
Inserts sample data for development and testing:
- Sample food categories (Appetizers, Main Courses, Desserts, etc.)
- Sample food items with realistic pricing
- Admin and customer test accounts
- Sample order with order items and status history

## Database Schema Overview

### Core Tables

#### users
- Stores customer and admin user information
- Includes authentication data (email/password)
- Role-based access (customer/admin)

#### categories
- Food item categories for menu organization
- Supports active/inactive status

#### food_items
- Menu items with pricing, descriptions, and images
- Links to categories
- Availability and featured item flags
- Preparation time tracking

#### orders
- Customer orders with delivery/pickup options
- Payment method tracking
- Order status workflow
- Customer contact information

#### order_items
- Junction table linking orders to food items
- Quantity and pricing information
- Supports order total calculation

#### cart_items
- Persistent shopping cart storage
- User-specific cart management
- Automatic cleanup capabilities

#### order_status_history
- Audit trail for order status changes
- Tracks who made changes and when
- Supports order tracking features

## Key Features

### Security
- Row Level Security (RLS) policies ensure data privacy
- Role-based access control (customer/admin)
- Secure user context management

### Business Logic
- Automatic order total calculation
- Order status change tracking
- Data validation triggers
- Analytics and reporting functions

### Performance
- Optimized indexes for common queries
- Efficient foreign key relationships
- Proper data types and constraints

## Setup Instructions

1. **Create a new Supabase project** or reset your existing database
2. **Run migrations in order**:
   ```sql
   -- Run each file in the Supabase SQL editor
   \i 01_initial_schema.sql
   \i 02_rls_policies.sql
   \i 03_functions_and_triggers.sql
   \i 04_sample_data.sql
   ```

3. **Verify the setup**:
   - Check that all tables are created
   - Verify RLS policies are active
   - Test with sample data

## Test Accounts

After running the sample data migration:

### Admin Account
- **Email**: admin@boki.com
- **Password**: admin123
- **Role**: admin

### Customer Account
- **Email**: customer@example.com
- **Password**: customer123
- **Role**: customer

## Environment Variables

Make sure your `.env` file contains the correct Supabase credentials:
```
VITE_PUBLIC_SUPABASE_URL="your-supabase-url"
VITE_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Notes

- The system uses UUID primary keys for better scalability
- All timestamps are stored with timezone information
- Prices are stored as DECIMAL(10,2) for accurate financial calculations
- The system supports both authenticated and guest checkout flows
- Order status follows a defined workflow: pending → preparing → ready → out_for_delivery → completed
- Cart items are automatically cleaned up after 30 days of inactivity

## Troubleshooting

If you encounter issues:
1. Ensure you have the necessary permissions in Supabase
2. Check that all environment variables are correctly set
3. Verify that RLS policies are not blocking your queries
4. Use the `set_user_context()` function in your application hooks for proper RLS context