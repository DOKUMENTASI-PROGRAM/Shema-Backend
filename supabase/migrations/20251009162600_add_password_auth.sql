-- Migration: Add Password Authentication Support
-- Date: 2025-10-09
-- Description: Add password_hash column to support JWT-based authentication
--              alongside existing Firebase Auth for hybrid authentication model

-- Add password_hash column for JWT authentication
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash text;

-- Add auth_provider column to distinguish authentication methods
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_provider varchar(20) DEFAULT 'password';

-- Update existing users to use firebase provider if they have firebase_uid
UPDATE public.users 
SET auth_provider = 'firebase' 
WHERE firebase_uid IS NOT NULL;

-- Add constraint: users must have either firebase_uid OR password_hash
ALTER TABLE public.users
ADD CONSTRAINT chk_auth_method CHECK (
    (firebase_uid IS NOT NULL AND auth_provider = 'firebase') OR 
    (password_hash IS NOT NULL AND auth_provider = 'password')
);

-- Add index for faster auth lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);

-- Add comment for documentation
COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt hashed password for JWT authentication (students/teachers)';
COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider: firebase (admin) or password (students/teachers)';
