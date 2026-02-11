
-- NewsFlow Pro Social Media Integration Schema
-- For use with PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations/Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Social Media Connections (The Vault)
CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'Facebook', 'X', 'YouTube', etc.
    
    -- OAuth 2.0 Credentials
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    platform_user_id VARCHAR(255),
    platform_username VARCHAR(255),
    platform_avatar_url TEXT,
    page_id VARCHAR(255), -- Specific ID for FB Page, YT Channel, IG Business
    
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(team_id, platform, platform_user_id)
);

-- 3. Scheduled Content Queue
CREATE TABLE content_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    title TEXT,
    caption TEXT NOT NULL,
    media_url TEXT,
    video_url TEXT,
    
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'publishing', 'success', 'failed'
    
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit & History
CREATE TABLE broadcast_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES content_queue(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES social_connections(id) ON DELETE CASCADE,
    
    platform VARCHAR(50) NOT NULL,
    external_post_id VARCHAR(255), -- The ID returned by FB/X/YT
    
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reach_estimate INTEGER DEFAULT 0,
    
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API ROUTE DEFINITIONS (Conceptual for Node.js Express)
--
-- GET /api/auth/:platform -> Redirects to OAUTH_CONFIGS[platform].authUrl
-- GET /api/auth/:platform/callback -> Handles code exchange, saves to social_connections
-- POST /api/broadcast -> Takes caption + media, pushes to worker for publication
-- POST /api/refresh -> Background worker triggers refreshConnection logic
-- GET /api/metrics/:post_id -> Fetches real-time Graph API stats
