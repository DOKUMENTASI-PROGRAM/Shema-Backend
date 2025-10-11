-- Update admin authentication constraint
-- Allow admins to use either Firebase or password authentication

-- Drop the existing constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS chk_admin_requires_firebase;

-- Add updated constraint: admins can use password auth
ALTER TABLE public.users
ADD CONSTRAINT chk_admin_requires_firebase CHECK (
    (role <> 'admin'::user_role) OR
    (firebase_uid IS NOT NULL) OR
    (password_hash IS NOT NULL AND auth_provider = 'password')
);