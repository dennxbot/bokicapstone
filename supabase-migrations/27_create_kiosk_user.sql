-- Create dedicated kiosk user for auto-login functionality
-- This user will be used for kiosk terminals to automatically login

-- Delete existing kiosk user records if they exist
DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert kiosk user into auth.users table (Supabase's authentication table)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'kiosk@boki.com',
    crypt('kiosk_terminal_2024', gen_salt('bf')), -- Encrypted password using bcrypt
    NOW(), -- Email confirmed immediately
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "admin", "full_name": "BOKI Kiosk Terminal", "contact_number": "+63-000-000-0000"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
);

-- Insert corresponding identity record
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub": "00000000-0000-0000-0000-000000000001", "email": "kiosk@boki.com"}',
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- Create the kiosk user profile in our users table
INSERT INTO public.users (
  id,
  email,
  password,
  full_name,
  contact_number,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for kiosk user
  'kiosk@boki.com',
  'kiosk_terminal_2024',
  'BOKI Kiosk Terminal',
  '+63-000-000-0000',
  'admin', -- Give admin role for kiosk operations
  now(),
  now()
);

-- Create a function to identify kiosk sessions
CREATE OR REPLACE FUNCTION is_kiosk_user()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email = 'kiosk@boki.com'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for kiosk operations
-- Kiosk should be able to:
-- 1. View all food items and categories
-- 2. Create orders
-- 3. View order status
-- 4. Access basic reports (for staff functions)

-- Add RLS policy for kiosk user to access all data needed for operations
-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Kiosk user can access all food items" ON public.food_items;
CREATE POLICY "Kiosk user can access all food items" ON public.food_items
  FOR SELECT
  TO authenticated
  USING (is_kiosk_user());

DROP POLICY IF EXISTS "Kiosk user can access all categories" ON public.categories;
CREATE POLICY "Kiosk user can access all categories" ON public.categories
  FOR SELECT
  TO authenticated
  USING (is_kiosk_user());

DROP POLICY IF EXISTS "Kiosk user can create orders" ON public.orders;
CREATE POLICY "Kiosk user can create orders" ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (is_kiosk_user());

DROP POLICY IF EXISTS "Kiosk user can view all orders" ON public.orders;
CREATE POLICY "Kiosk user can view all orders" ON public.orders
  FOR SELECT
  TO authenticated
  USING (is_kiosk_user());

DROP POLICY IF EXISTS "Kiosk user can update order status" ON public.orders;
CREATE POLICY "Kiosk user can update order status" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (is_kiosk_user())
  WITH CHECK (is_kiosk_user());

-- Add comment for documentation
COMMENT ON FUNCTION is_kiosk_user() IS 'Helper function to identify if current user is the kiosk terminal user';