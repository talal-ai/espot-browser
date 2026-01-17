-- Migration: Add user_proxies table for proxy assignment system
-- Date: 2025-12-30
-- Description: Creates junction table for assigning proxies to users

-- =============================================================================
-- USER PROXIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, proxy_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_user_proxies_user_id ON user_proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_proxies_proxy_id ON user_proxies(proxy_id);
CREATE INDEX IF NOT EXISTS idx_user_proxies_is_default ON user_proxies(is_default);
CREATE INDEX IF NOT EXISTS idx_user_proxies_created_at ON user_proxies(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE user_proxies ENABLE ROW LEVEL SECURITY;

-- Users can view their own proxy assignments
CREATE POLICY "Users can view their own proxy assignments" ON user_proxies
    FOR SELECT USING (user_id = auth.uid());

-- Admins can manage all proxy assignments
CREATE POLICY "Admins can manage proxy assignments" ON user_proxies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE user_proxies IS 'Junction table linking users to their assigned proxies';
COMMENT ON COLUMN user_proxies.user_id IS 'Reference to the user who has the proxy assigned';
COMMENT ON COLUMN user_proxies.proxy_id IS 'Reference to the assigned proxy';
COMMENT ON COLUMN user_proxies.assigned_by IS 'Admin user who made the assignment';
COMMENT ON COLUMN user_proxies.is_default IS 'Whether this is the default proxy for the user';
COMMENT ON COLUMN user_proxies.last_used_at IS 'Last time this proxy was used by the user';
