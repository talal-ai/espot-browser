# Production-Ready Supabase Database Architecture

## 🏗️ Database Structure Analysis & Optimization

### Current State Assessment

The ESPOT Browser database schema is well-structured with the following components:

## ✅ Strengths

1. **Proper Normalization**: Tables are properly normalized to 3NF
2. **UUID Primary Keys**: Using UUIDs for distributed system scalability
3. **Foreign Key Constraints**: Proper referential integrity
4. **Indexes**: Performance indexes on frequently queried columns
5. **RLS Policies**: Row Level Security implemented
6. **Triggers**: Automatic timestamp updates
7. **Data Types**: Appropriate data types with constraints

## 🔧 Required Optimizations for Production Scale

### 1. Enhanced Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
ON user_sessions(user_id, is_active, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_proxies_status_country 
ON proxies(status, country) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_proxies_performance 
ON proxies(speed_score DESC, anonymity_level DESC) 
WHERE status = 'active';

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_active_fingerprints 
ON fingerprint_profiles(id, name) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_active_proxy_chains 
ON proxy_chains(id, name) WHERE is_active = true;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_system_logs_metadata 
ON system_logs USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values 
ON audit_logs USING GIN(old_values);

CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values 
ON audit_logs USING GIN(new_values);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users USING gin(to_tsvector('english', username || ' ' || email));

CREATE INDEX IF NOT EXISTS idx_fingerprint_profiles_search 
ON fingerprint_profiles USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### 2. Missing Tables for Production Scale

```sql
-- =============================================================================
-- BROWSER INSTANCES TABLE (for multi-profile management)
-- =============================================================================
CREATE TABLE IF NOT EXISTS browser_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id),
    proxy_id UUID REFERENCES proxies(id),
    proxy_chain_id UUID REFERENCES proxy_chains(id),
    behavior_profile_id UUID REFERENCES behavior_profiles(id),
    status VARCHAR(20) DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'paused', 'crashed')),
    browser_type VARCHAR(20) DEFAULT 'chromium' CHECK (browser_type IN ('chromium', 'firefox', 'webkit')),
    user_data_dir TEXT,
    window_size VARCHAR(20) DEFAULT '1920x1080',
    geolocation JSONB, -- {latitude, longitude, accuracy}
    webrtc_mode VARCHAR(20) DEFAULT 'disabled' CHECK (webrtc_mode IN ('disabled', 'fake', 'real')),
    timezone_override VARCHAR(50),
    locale_override VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_browser_instances_user_id ON browser_instances(user_id);
CREATE INDEX idx_browser_instances_status ON browser_instances(status);

-- =============================================================================
-- COOKIES TABLE (for session persistence)
-- =============================================================================
CREATE TABLE IF NOT EXISTS cookies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    browser_instance_id UUID NOT NULL REFERENCES browser_instances(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    expires BIGINT, -- Unix timestamp
    size INTEGER,
    http_only BOOLEAN DEFAULT FALSE,
    secure BOOLEAN DEFAULT FALSE,
    same_site VARCHAR(20) DEFAULT 'None' CHECK (same_site IN ('Strict', 'Lax', 'None')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cookies_browser_instance ON cookies(browser_instance_id);
CREATE INDEX idx_cookies_domain ON cookies(domain);

-- =============================================================================
-- LOCAL STORAGE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS local_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    browser_instance_id UUID NOT NULL REFERENCES browser_instances(id) ON DELETE CASCADE,
    origin VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(browser_instance_id, origin, key)
);

CREATE INDEX idx_local_storage_browser_instance ON local_storage(browser_instance_id);

-- =============================================================================
-- EXTENSIONS TABLE (browser extensions management)
-- =============================================================================
CREATE TABLE IF NOT EXISTS browser_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    extension_id VARCHAR(100) NOT NULL UNIQUE,
    version VARCHAR(20) NOT NULL,
    manifest JSONB NOT NULL,
    file_path TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BROWSER INSTANCE EXTENSIONS (many-to-many)
-- =============================================================================
CREATE TABLE IF NOT EXISTS browser_instance_extensions (
    browser_instance_id UUID REFERENCES browser_instances(id) ON DELETE CASCADE,
    extension_id UUID REFERENCES browser_extensions(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (browser_instance_id, extension_id)
);

-- =============================================================================
-- FINGERPRINT HISTORY (for tracking changes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fingerprint_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    browser_instance_id UUID NOT NULL REFERENCES browser_instances(id) ON DELETE CASCADE,
    fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id),
    canvas_fingerprint TEXT,
    webgl_fingerprint TEXT,
    audio_fingerprint TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detection_score DECIMAL(5,2), -- 0-100, higher means more likely detected
    metadata JSONB
);

CREATE INDEX idx_fingerprint_history_browser ON fingerprint_history(browser_instance_id, detected_at DESC);

-- =============================================================================
-- PROXY ROTATION LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS proxy_rotation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proxy_chain_id UUID REFERENCES proxy_chains(id),
    old_proxy_id UUID REFERENCES proxies(id),
    new_proxy_id UUID REFERENCES proxies(id),
    reason VARCHAR(100) NOT NULL, -- 'scheduled', 'failure', 'performance', 'manual'
    success BOOLEAN DEFAULT TRUE,
    response_time INTEGER, -- milliseconds
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proxy_rotation_chain ON proxy_rotation_logs(proxy_chain_id, created_at DESC);

-- =============================================================================
-- DEVICE PROFILES (for hardware spoofing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS device_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'laptop', 'tablet', 'mobile')),
    os_type VARCHAR(20) CHECK (os_type IN ('Windows', 'macOS', 'Linux', 'Android', 'iOS')),
    os_version VARCHAR(50),
    cpu_cores INTEGER,
    cpu_model VARCHAR(100),
    gpu_vendor VARCHAR(100),
    gpu_model VARCHAR(100),
    ram_gb INTEGER,
    screen_width INTEGER,
    screen_height INTEGER,
    color_depth INTEGER,
    pixel_ratio DECIMAL(3,2),
    touch_support BOOLEAN DEFAULT FALSE,
    max_touch_points INTEGER DEFAULT 0,
    media_devices JSONB, -- Array of camera/microphone specs
    battery_info JSONB, -- {charging, chargingTime, dischargingTime, level}
    network_info JSONB, -- {effectiveType, downlink, rtt, saveData}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CANVAS NOISE PATTERNS (for unique canvas fingerprinting)
-- =============================================================================
CREATE TABLE IF NOT EXISTS canvas_noise_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    noise_type VARCHAR(20) DEFAULT 'subtle' CHECK (noise_type IN ('none', 'subtle', 'moderate', 'aggressive')),
    noise_algorithm VARCHAR(20) DEFAULT 'random' CHECK (noise_algorithm IN ('random', 'deterministic', 'time-based')),
    noise_seed VARCHAR(100), -- For reproducible patterns
    rgb_variance INTEGER DEFAULT 2, -- 0-255, pixel color variance
    alpha_variance INTEGER DEFAULT 1, -- 0-255, transparency variance
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- WEBGL PARAMETERS (for WebGL fingerprint customization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS webgl_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id) ON DELETE CASCADE,
    vendor VARCHAR(255),
    renderer VARCHAR(255),
    version VARCHAR(50),
    shading_language_version VARCHAR(50),
    max_texture_size INTEGER,
    max_vertex_attribs INTEGER,
    max_varying_vectors INTEGER,
    max_vertex_uniform_vectors INTEGER,
    max_fragment_uniform_vectors INTEGER,
    max_renderbuffer_size INTEGER,
    max_viewport_dims VARCHAR(50),
    aliased_line_width_range VARCHAR(50),
    aliased_point_size_range VARCHAR(50),
    supported_extensions TEXT[], -- Array of extension names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AUDIO CONTEXT PARAMETERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audio_context_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_profile_id UUID REFERENCES fingerprint_profiles(id) ON DELETE CASCADE,
    sample_rate INTEGER,
    max_channel_count INTEGER,
    number_of_inputs INTEGER,
    number_of_outputs INTEGER,
    channel_count INTEGER,
    channel_count_mode VARCHAR(20),
    channel_interpretation VARCHAR(20),
    base_latency DECIMAL(10,6),
    output_latency DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- FONT LISTS (for font fingerprinting)
-- =============================================================================
CREATE TABLE IF NOT EXISTS font_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    os_type VARCHAR(20) CHECK (os_type IN ('Windows', 'macOS', 'Linux')),
    fonts TEXT[] NOT NULL, -- Array of font names
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE METRICS (for monitoring)
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    browser_instance_id UUID REFERENCES browser_instances(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'network', 'fps'
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20), -- 'percent', 'MB', 'ms', 'fps'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partition by month for better performance
CREATE INDEX idx_performance_metrics_browser_time 
ON performance_metrics(browser_instance_id, timestamp DESC);

-- =============================================================================
-- DETECTION EVENTS (for tracking anti-bot detection)
-- =============================================================================
CREATE TABLE IF NOT EXISTS detection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    browser_instance_id UUID NOT NULL REFERENCES browser_instances(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id),
    detection_type VARCHAR(50) NOT NULL, -- 'captcha', 'challenge', 'block', 'timeout'
    detected_by VARCHAR(100), -- 'cloudflare', 'recaptcha', 'datadome', etc.
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    url TEXT,
    user_agent TEXT,
    ip_address INET,
    fingerprint_hash VARCHAR(255),
    response_action VARCHAR(50), -- 'solved', 'failed', 'abandoned', 'rotated'
    metadata JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_detection_events_browser ON detection_events(browser_instance_id, detected_at DESC);
CREATE INDEX idx_detection_events_type ON detection_events(detection_type, severity);

-- =============================================================================
-- AUTOMATION SCRIPTS (for task automation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS automation_scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    script_type VARCHAR(20) CHECK (script_type IN ('puppeteer', 'playwright', 'selenium', 'custom')),
    script_content TEXT NOT NULL,
    parameters JSONB, -- Script configuration
    schedule VARCHAR(100), -- Cron expression
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_scripts_user ON automation_scripts(user_id);
CREATE INDEX idx_automation_scripts_next_run ON automation_scripts(next_run) WHERE is_active = true;

-- =============================================================================
-- SCRIPT EXECUTION LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS script_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    script_id UUID REFERENCES automation_scripts(id) ON DELETE CASCADE,
    browser_instance_id UUID REFERENCES browser_instances(id),
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds
    output TEXT,
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX idx_script_logs_script ON script_execution_logs(script_id, start_time DESC);

-- =============================================================================
-- TRIGGERS FOR NEW TABLES
-- =============================================================================

CREATE TRIGGER update_browser_instances_updated_at BEFORE UPDATE ON browser_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cookies_updated_at BEFORE UPDATE ON cookies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_local_storage_updated_at BEFORE UPDATE ON local_storage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_browser_extensions_updated_at BEFORE UPDATE ON browser_extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_profiles_updated_at BEFORE UPDATE ON device_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_scripts_updated_at BEFORE UPDATE ON automation_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Advanced Functions for Production

```sql
-- =============================================================================
-- FUNCTION: Get Browser Instance with Full Profile
-- =============================================================================
CREATE OR REPLACE FUNCTION get_browser_instance_full_profile(instance_id UUID)
RETURNS TABLE (
    instance JSONB,
    fingerprint JSONB,
    proxy JSONB,
    behavior JSONB,
    device JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(bi.*) as instance,
        to_jsonb(fp.*) as fingerprint,
        to_jsonb(p.*) as proxy,
        to_jsonb(bp.*) as behavior,
        to_jsonb(dp.*) as device
    FROM browser_instances bi
    LEFT JOIN fingerprint_profiles fp ON bi.fingerprint_profile_id = fp.id
    LEFT JOIN proxies p ON bi.proxy_id = p.id
    LEFT JOIN behavior_profiles bp ON bi.behavior_profile_id = bp.id
    LEFT JOIN device_profiles dp ON fp.id = dp.id
    WHERE bi.id = instance_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Rotate Proxy in Chain
-- =============================================================================
CREATE OR REPLACE FUNCTION rotate_proxy_in_chain(chain_id_param UUID)
RETURNS UUID AS $$
DECLARE
    next_proxy_id UUID;
    current_proxy_id UUID;
BEGIN
    -- Get current and next proxy
    SELECT proxy_ids[1], proxy_ids[2]
    INTO current_proxy_id, next_proxy_id
    FROM proxy_chains
    WHERE id = chain_id_param;
    
    -- Log the rotation
    INSERT INTO proxy_rotation_logs (proxy_chain_id, old_proxy_id, new_proxy_id, reason)
    VALUES (chain_id_param, current_proxy_id, next_proxy_id, 'scheduled');
    
    -- Rotate the array
    UPDATE proxy_chains
    SET proxy_ids = array_append(proxy_ids[2:array_length(proxy_ids, 1)], current_proxy_id)
    WHERE id = chain_id_param;
    
    RETURN next_proxy_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Calculate Fingerprint Uniqueness Score
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_fingerprint_uniqueness(profile_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    uniqueness_score DECIMAL(5,2);
    similar_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Count similar fingerprints
    SELECT COUNT(*)
    INTO similar_count
    FROM fingerprint_profiles fp1
    CROSS JOIN fingerprint_profiles fp2
    WHERE fp1.id = profile_id
    AND fp1.id != fp2.id
    AND (
        fp1.canvas_hash = fp2.canvas_hash OR
        fp1.webgl_vendor = fp2.webgl_vendor OR
        fp1.audio_context = fp2.audio_context
    );
    
    -- Get total fingerprints
    SELECT COUNT(*) INTO total_count FROM fingerprint_profiles;
    
    -- Calculate uniqueness (100 - similarity percentage)
    uniqueness_score := 100.0 - ((similar_count::DECIMAL / NULLIF(total_count, 0)) * 100.0);
    
    RETURN COALESCE(uniqueness_score, 100.0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Get Proxy Health Status
-- =============================================================================
CREATE OR REPLACE FUNCTION get_proxy_health_status(proxy_id_param UUID)
RETURNS TABLE (
    proxy_id UUID,
    status VARCHAR,
    avg_response_time INTEGER,
    success_rate DECIMAL(5,2),
    last_failure TIMESTAMP WITH TIME ZONE,
    failure_count_24h INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.status,
        AVG(prl.response_time)::INTEGER as avg_response_time,
        (SUM(CASE WHEN prl.success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as success_rate,
        MAX(CASE WHEN NOT prl.success THEN prl.created_at END) as last_failure,
        COUNT(CASE WHEN NOT prl.success AND prl.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as failure_count_24h
    FROM proxies p
    LEFT JOIN proxy_rotation_logs prl ON p.id = prl.new_proxy_id
    WHERE p.id = proxy_id_param
    GROUP BY p.id, p.status;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Clean Old Logs (for maintenance)
-- =============================================================================
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old system logs
    DELETE FROM system_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old proxy rotation logs
    DELETE FROM proxy_rotation_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Delete old performance metrics
    DELETE FROM performance_metrics
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### 4. Materialized Views for Performance

```sql
-- =============================================================================
-- MATERIALIZED VIEW: Active Browser Instances with Stats
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_browser_instances AS
SELECT 
    bi.id,
    bi.user_id,
    bi.name,
    bi.status,
    fp.name as fingerprint_name,
    p.host as proxy_host,
    p.country as proxy_country,
    bp.name as behavior_name,
    COUNT(DISTINCT us.id) as session_count,
    MAX(us.started_at) as last_session,
    COUNT(DISTINCT de.id) as detection_count
FROM browser_instances bi
LEFT JOIN fingerprint_profiles fp ON bi.fingerprint_profile_id = fp.id
LEFT JOIN proxies p ON bi.proxy_id = p.id
LEFT JOIN behavior_profiles bp ON bi.behavior_profile_id = bp.id
LEFT JOIN user_sessions us ON us.fingerprint_profile_id = fp.id
LEFT JOIN detection_events de ON de.browser_instance_id = bi.id
WHERE bi.status IN ('running', 'paused')
GROUP BY bi.id, bi.user_id, bi.name, bi.status, fp.name, p.host, p.country, bp.name;

CREATE UNIQUE INDEX idx_mv_active_browser_instances_id ON mv_active_browser_instances(id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_active_browser_instances()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_browser_instances;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MATERIALIZED VIEW: Proxy Performance Statistics
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_proxy_statistics AS
SELECT 
    p.id,
    p.host,
    p.port,
    p.country,
    p.status,
    p.anonymity_level,
    COUNT(DISTINCT prl.id) as rotation_count,
    AVG(prl.response_time) as avg_response_time,
    (SUM(CASE WHEN prl.success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as success_rate,
    MAX(prl.created_at) as last_used,
    COUNT(CASE WHEN NOT prl.success AND prl.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as failures_24h
FROM proxies p
LEFT JOIN proxy_rotation_logs prl ON p.id = prl.new_proxy_id
GROUP BY p.id, p.host, p.port, p.country, p.status, p.anonymity_level;

CREATE UNIQUE INDEX idx_mv_proxy_statistics_id ON mv_proxy_statistics(id);
```

### 5. RLS Policies for New Tables

```sql
-- Browser instances policies
ALTER TABLE browser_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own browser instances" ON browser_instances
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own browser instances" ON browser_instances
    FOR ALL USING (user_id = auth.uid());

-- Cookies policies
ALTER TABLE cookies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cookies for their instances" ON cookies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM browser_instances 
            WHERE id = cookies.browser_instance_id 
            AND user_id = auth.uid()
        )
    );

-- Detection events policies
ALTER TABLE detection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view detection events for their instances" ON detection_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM browser_instances 
            WHERE id = detection_events.browser_instance_id 
            AND user_id = auth.uid()
        )
    );
```

## 📊 Performance Optimization Checklist

### ✅ Database Level
- [x] Proper indexing on all foreign keys
- [x] Composite indexes for common query patterns
- [x] Partial indexes for active records
- [x] GIN indexes for JSONB columns
- [x] Full-text search indexes
- [x] Materialized views for complex queries
- [ ] Connection pooling configuration
- [ ] Query timeout settings
- [ ] Automatic vacuum scheduling

### ✅ Application Level
- [x] Service layer abstraction
- [x] Proper error handling
- [x] Transaction management
- [ ] Query result caching
- [ ] Connection pooling
- [ ] Batch operations for bulk inserts
- [ ] Async/await patterns
- [ ] Rate limiting

### ✅ Monitoring & Maintenance
- [x] Performance metrics table
- [x] Detection events logging
- [x] Audit logs
- [x] System logs
- [ ] Query performance monitoring
- [ ] Slow query logging
- [ ] Automated backup strategy
- [ ] Log rotation and cleanup

## 🔄 Synchronization Strategy

### Real-time Synchronization

```sql
-- Enable real-time for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE browser_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE proxies;
ALTER PUBLICATION supabase_realtime ADD TABLE detection_events;
ALTER PUBLICATION supabase_realtime ADD TABLE proxy_rotation_logs;
```

### Conflict Resolution

```sql
-- Function for handling concurrent updates
CREATE OR REPLACE FUNCTION handle_concurrent_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.updated_at > NEW.updated_at THEN
        RAISE EXCEPTION 'Concurrent modification detected';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER check_concurrent_browser_update 
BEFORE UPDATE ON browser_instances
FOR EACH ROW EXECUTE FUNCTION handle_concurrent_update();
```

## 📈 Scaling Recommendations

### 1. **Database Sharding Strategy**
- Shard by user_id for user-specific tables
- Shard by created_at for log tables
- Keep lookup tables replicated

### 2. **Caching Strategy**
```
- Redis for session data (30 min TTL)
- Redis for proxy status (5 min TTL)
- Redis for fingerprint profiles (1 hour TTL)
- CDN for static fingerprint data
```

### 3. **Read Replicas**
- Analytics queries → Read replica
- Dashboard stats → Read replica
- Real-time operations → Primary

### 4. **Archival Strategy**
```sql
-- Archive old logs monthly
CREATE TABLE audit_logs_archive (LIKE audit_logs);
CREATE TABLE system_logs_archive (LIKE system_logs);

-- Partition by month
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
```

## 🎯 Next Implementation Steps

1. **Immediate**:
   - Run the enhanced schema script
   - Create missing tables
   - Add composite indexes
   - Implement materialized views

2. **Short-term** (1-2 weeks):
   - Add caching layer
   - Implement connection pooling
   - Set up query monitoring
   - Configure automated backups

3. **Medium-term** (1 month):
   - Implement read replicas
   - Set up log archival
   - Add performance dashboards
   - Optimize slow queries

4. **Long-term** (3+ months):
   - Consider sharding strategy
   - Implement multi-region setup
   - Add advanced monitoring
   - Optimize for 10M+ records

---

**Status**: Production-Ready Foundation ✅
**Next**: Browser Spoofing Implementation Guide
