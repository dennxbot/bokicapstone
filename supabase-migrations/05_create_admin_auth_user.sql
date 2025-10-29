-- Create Admin User in Supabase Auth System
-- This migration creates a verified admin user in the auth.users table

-- Insert admin user into auth.users table (Supabase's authentication table)
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
    '770e8400-e29b-41d4-a716-446655440001',
    'authenticated',
    'authenticated',
    'admin@boki.com',
    crypt('admin123', gen_salt('bf')), -- Encrypted password using bcrypt
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
    '{"role": "admin", "full_name": "BOKI Administrator", "contact_number": "+1234567890", "address": "123 Admin Street, City, State"}',
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
    '770e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    '{"sub": "770e8400-e29b-41d4-a716-446655440001", "email": "admin@boki.com"}',
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- Insert admin user back into custom users table (since it was deleted)
INSERT INTO users (id, email, password, full_name, contact_number, address, role) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 'admin@boki.com', 'admin123', 'BOKI Administrator', '+1234567890', '123 Admin Street, City, State', 'admin');