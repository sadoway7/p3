-- Add privacy column to communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) DEFAULT 'public';

-- Create community_members table for tracking membership
CREATE TABLE IF NOT EXISTS community_members (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'moderator', 'admin'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create community_rules table
CREATE TABLE IF NOT EXISTS community_rules (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(id)
);

-- Create community_settings table
CREATE TABLE IF NOT EXISTS community_settings (
    community_id VARCHAR(36) PRIMARY KEY,
    allow_post_images BOOLEAN DEFAULT TRUE,
    allow_post_links BOOLEAN DEFAULT TRUE,
    join_method VARCHAR(20) DEFAULT 'auto_approve', -- 'auto_approve', 'requires_approval', 'invite_only'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(id)
);

-- Create join requests table for tracking pending membership requests
CREATE TABLE IF NOT EXISTS community_join_requests (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);