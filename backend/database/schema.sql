-- ESPOT Browser Database Schema
-- Production-ready database schema for Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- PROXIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    protocol VARCHAR(20) NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5', 'shadowsocks')),
    username VARCHAR(100),
    password VARCHAR(100),
    country VARCHAR(2) NOT NULL, -- ISO country code
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_checked TIMESTAMP WITH TIME ZONE,
    speed_score DECIMAL(5,2) CHECK (speed_score >= 0 AND speed_score <= 100),
    anonymity_level INTEGER CHECK (anonymity_level >= 1 AND anonymity_level <= 10)
);

-- =============================================================================
-- FINGERPRINT PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS fingerprint_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    fingerprint_type VARCHAR(20) NOT NULL CHECK (fingerprint_type IN ('canvas', 'webgl', 'audio', 'font', 'screen', 'hardware')),
    canvas_hash VARCHAR(255),
    webgl_vendor VARCHAR(255),
    webgl_renderer VARCHAR(255),
    audio_context VARCHAR(255),
    font_fingerprint TEXT,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    platform VARCHAR(50),
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    color_depth INTEGER,
    pixel_ratio DECIMAL(3,2),
    injection_scripts JSONB,
    webgl_params JSONB,
    audio_context_params JSONB,
    seed INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- USER FINGERPRINT PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_fingerprint_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint_profile_id UUID NOT NULL REFERENCES fingerprint_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, fingerprint_profile_id)
);

-- =============================================================================
-- USER SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id),
    proxy_id UUID REFERENCES proxies(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    pages_visited INTEGER DEFAULT 0,
    anonymity_level INTEGER CHECK (anonymity_level >= 1 AND anonymity_level <= 10)
);

-- =============================================================================
-- PROXY CHAINS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS proxy_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    proxy_ids UUID[] NOT NULL, -- Array of proxy IDs in order
    rotation_interval INTEGER DEFAULT 300, -- seconds
    failover_enabled BOOLEAN DEFAULT TRUE,
    health_check_interval INTEGER DEFAULT 60, -- seconds
    max_failures INTEGER DEFAULT 3,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BEHAVIOR PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS behavior_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    mouse_speed DECIMAL(5,2) DEFAULT 1.0,
    click_delay INTEGER DEFAULT 100, -- milliseconds
    scroll_pattern VARCHAR(20) DEFAULT 'smooth',
    typing_speed INTEGER DEFAULT 200, -- characters per minute
    pause_patterns INTEGER[], -- Array of pause durations in milliseconds
    mouse_movement_style VARCHAR(20) DEFAULT 'natural' CHECK (mouse_movement_style IN ('linear', 'curved', 'random', 'natural')),
    click_pattern VARCHAR(20) DEFAULT 'single' CHECK (click_pattern IN ('single', 'double', 'triple')),
    scroll_behavior VARCHAR(20) DEFAULT 'smooth' CHECK (scroll_behavior IN ('smooth', 'jerky', 'natural')),
    keyboard_rhythm VARCHAR(20) DEFAULT 'variable' CHECK (keyboard_rhythm IN ('fast', 'slow', 'variable')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    module VARCHAR(100),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default profile column to users (circular reference handling)
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Proxies indexes
CREATE INDEX IF NOT EXISTS idx_proxies_country ON proxies(country);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON proxies(protocol);
CREATE INDEX IF NOT EXISTS idx_proxies_speed_score ON proxies(speed_score);
CREATE INDEX IF NOT EXISTS idx_proxies_anonymity_level ON proxies(anonymity_level);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON user_sessions(started_at);

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fingerprint_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fingerprint_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Proxies policies
CREATE POLICY "Authenticated users can view proxies" ON proxies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage proxies" ON proxies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User Fingerprint Profiles policies
CREATE POLICY "Users can view their own assigned profiles" ON user_fingerprint_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage assignments" ON user_fingerprint_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fingerprint_profiles_updated_at BEFORE UPDATE ON fingerprint_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_chains_updated_at BEFORE UPDATE ON proxy_chains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_profiles_updated_at BEFORE UPDATE ON behavior_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, status) VALUES
('admin', 'admin@espot-browser.com', crypt('admin123', gen_salt('bf')), 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert default fingerprint profiles
INSERT INTO fingerprint_profiles (name, description, fingerprint_type, user_agent, platform) VALUES
('Default Chrome', 'Default Chrome fingerprint', 'canvas', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Windows'),
('Default Firefox', 'Default Firefox fingerprint', 'canvas', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', 'Windows'),
('Default Safari', 'Default Safari fingerprint', 'canvas', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', 'macOS')
ON CONFLICT DO NOTHING;

-- Insert default behavior profiles
INSERT INTO behavior_profiles (name, description, mouse_speed, typing_speed) VALUES
('Human-like', 'Natural human behavior patterns', 1.0, 200),
('Fast', 'Quick interactions for efficiency', 1.5, 300),
('Slow', 'Deliberate interactions for stealth', 0.7, 150)
ON CONFLICT DO NOTHING;
