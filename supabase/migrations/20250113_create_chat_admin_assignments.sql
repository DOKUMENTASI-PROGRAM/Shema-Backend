-- Migration: Create chat_admin_assignments table
-- Description: Table to track admin assignments to chat sessions
-- Date: 2025-01-13

-- Create chat_admin_assignments table
CREATE TABLE IF NOT EXISTS public.chat_admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one admin per session (can be updated)
    UNIQUE(session_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_admin_assignments_session_id 
    ON public.chat_admin_assignments(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_admin_assignments_admin_id 
    ON public.chat_admin_assignments(admin_id);

-- Add comment
COMMENT ON TABLE public.chat_admin_assignments IS 'Tracks which admin is assigned to which chat session';
COMMENT ON COLUMN public.chat_admin_assignments.session_id IS 'References the chat session';
COMMENT ON COLUMN public.chat_admin_assignments.admin_id IS 'ID of the admin user (from auth.users)';
COMMENT ON COLUMN public.chat_admin_assignments.assigned_at IS 'When the admin was assigned to this session';
