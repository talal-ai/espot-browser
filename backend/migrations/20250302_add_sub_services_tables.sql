-- Migration: Add sub_services and user_sub_services tables
-- Date: 2025-03-02
-- Description: Sub-services under a parent service with own credentials; assign to users.

-- =============================================================================
-- SUB_SERVICES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sub_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted VARCHAR NOT NULL,
    visibility VARCHAR(50) DEFAULT 'hidden' CHECK (visibility IN ('hidden', 'visible')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- USER_SUB_SERVICES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sub_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, sub_service_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sub_services_service_id ON sub_services(service_id);
CREATE INDEX IF NOT EXISTS idx_user_sub_services_user_id ON user_sub_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sub_services_sub_service_id ON user_sub_services(sub_service_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE sub_services IS 'Sub-services under a parent service with own name and credentials; uses parent service URL for launch';
COMMENT ON TABLE user_sub_services IS 'Junction table assigning sub-services to users';
