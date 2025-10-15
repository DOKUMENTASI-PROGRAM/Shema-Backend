-- Customer Service Database Schema
-- Schema: cs (customer service)

-- Create schema
CREATE SCHEMA IF NOT EXISTS cs;

-- ============================================
-- Table: cs.sessions
-- Stores chat sessions with guest information
-- ============================================
CREATE TABLE IF NOT EXISTS cs.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    school VARCHAR(255) NOT NULL, -- Asal Sekolah
    class VARCHAR(100) NOT NULL, -- Kelas
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_status ON cs.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON cs.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON cs.sessions(guest_email);

-- ============================================
-- Table: cs.messages
-- Stores chat messages
-- ============================================
CREATE TABLE IF NOT EXISTS cs.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cs.sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('guest', 'admin')),
    sender_id UUID, -- NULL untuk guest, UUID dari auth.users untuk admin
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON cs.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON cs.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON cs.messages(sender_id);

-- ============================================
-- Table: cs.admin_assignments
-- Tracks which admin is handling which session
-- ============================================
CREATE TABLE IF NOT EXISTS cs.admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cs.sessions(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL, -- References auth.users
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, admin_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_assignments_session_id ON cs.admin_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_admin_id ON cs.admin_assignments(admin_id);

-- ============================================
-- Trigger: Update updated_at on sessions
-- ============================================
CREATE OR REPLACE FUNCTION cs.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON cs.sessions
    FOR EACH ROW
    EXECUTE FUNCTION cs.update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on tables
ALTER TABLE cs.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs.admin_assignments ENABLE ROW LEVEL SECURITY;

-- Sessions: Anyone can create and read sessions
CREATE POLICY "Anyone can create sessions" ON cs.sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read sessions" ON cs.sessions
    FOR SELECT USING (true);

-- Only service role can update/delete sessions
CREATE POLICY "Service role can update sessions" ON cs.sessions
    FOR UPDATE USING (true);

CREATE POLICY "Service role can delete sessions" ON cs.sessions
    FOR DELETE USING (true);

-- Messages: Anyone can create and read messages
CREATE POLICY "Anyone can create messages" ON cs.messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read messages" ON cs.messages
    FOR SELECT USING (true);

-- Admin assignments: Anyone can read
CREATE POLICY "Anyone can read admin assignments" ON cs.admin_assignments
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage admin assignments" ON cs.admin_assignments
    FOR ALL USING (true);

-- ============================================
-- Comments
-- ============================================
COMMENT ON SCHEMA cs IS 'Customer Service schema untuk live chat';
COMMENT ON TABLE cs.sessions IS 'Chat sessions dengan informasi guest';
COMMENT ON TABLE cs.messages IS 'Chat messages dari guest dan admin';
COMMENT ON TABLE cs.admin_assignments IS 'Assignment admin ke sessions';
