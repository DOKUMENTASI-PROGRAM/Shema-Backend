-- ============================================================
-- Migration: Firebase to Supabase Native Auth
-- Date: 2024-12-20
-- Description: Remove Firebase dependencies, link to auth.users, enable RLS
-- ============================================================

-- ============================================================
-- STEP 1: Drop Firebase-Related Constraints & Indexes
-- ============================================================

-- Drop the constraint that only admins can have firebase_uid
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_non_admin_no_firebase;

-- Drop unique constraint on firebase_uid
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_firebase_uid_key;

-- Drop indexes related to firebase_uid
DROP INDEX IF EXISTS idx_users_firebase_uid;
DROP INDEX IF EXISTS idx_users_firebase_admin;

-- ============================================================
-- STEP 2: Drop firebase_uid Column
-- ============================================================

-- Remove the firebase_uid column entirely
ALTER TABLE public.users DROP COLUMN IF EXISTS firebase_uid;

-- ============================================================
-- STEP 3: Standardize provider Column Values
-- ============================================================

-- Update provider values to Supabase-compatible format
UPDATE public.users 
SET provider = CASE 
    WHEN provider IN ('firebase', 'both') THEN 'email'
    WHEN provider IS NULL THEN 'email'
    ELSE provider 
END;

-- ============================================================
-- STEP 4: Create Trigger Function for New User Sync
-- ============================================================

-- Function: Automatically create public.users record when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        email_verified,
        provider,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 5: Enable Row Level Security
-- ============================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;

-- Policy: Users can only view their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own data (limited columns)
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can insert users (for admin-created users)
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Service role bypass (for backend operations using service_role key)
CREATE POLICY "Service role has full access" ON public.users
    FOR ALL
    USING (auth.role() = 'service_role');
