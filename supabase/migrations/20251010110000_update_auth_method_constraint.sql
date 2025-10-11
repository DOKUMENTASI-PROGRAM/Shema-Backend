-- Update auth method constraint to allow course_registration
-- Allow students to be created through course registration without password

-- Drop the existing constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS chk_auth_method;

-- Add updated constraint: allow course_registration provider
ALTER TABLE public.users
ADD CONSTRAINT chk_auth_method CHECK (
    (firebase_uid IS NOT NULL AND auth_provider = 'firebase') OR
    (password_hash IS NOT NULL AND auth_provider = 'password') OR
    (auth_provider = 'course_registration')
);