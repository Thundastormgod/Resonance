-- Create a test admin user
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
);

-- Add the user to the profiles table with an admin role
INSERT INTO public.profiles (id, username, full_name, role)
VALUES ((SELECT id FROM auth.users WHERE email = 'admin@example.com'), 'admin', 'Admin User', 'admin');
