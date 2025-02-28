-- Enhance community_settings table with additional moderation settings
ALTER TABLE community_settings 
ADD COLUMN IF NOT EXISTS require_post_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restricted_words TEXT,
ADD COLUMN IF NOT EXISTS custom_theme_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS custom_banner_url TEXT,
ADD COLUMN IF NOT EXISTS minimum_account_age_days INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_karma_required INT DEFAULT 0;

-- Create moderator_permissions table for granular control
CREATE TABLE IF NOT EXISTS moderator_permissions (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    can_manage_settings BOOLEAN DEFAULT FALSE,
    can_manage_members BOOLEAN DEFAULT FALSE, 
    can_manage_posts BOOLEAN DEFAULT FALSE,
    can_manage_comments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create post_moderation table for post approval workflow
CREATE TABLE IF NOT EXISTS post_moderation (
    post_id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    moderator_id VARCHAR(36),
    reason TEXT,
    moderated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);

-- Create moderation_logs table for tracking all moderator actions
CREATE TABLE IF NOT EXISTS moderation_logs (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    moderator_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'approve_post', 'remove_post', 'ban_user', etc.
    target_id VARCHAR(36), -- ID of the post, comment, or user that was acted upon
    target_type VARCHAR(20), -- 'post', 'comment', 'user', etc.
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);

-- Create banned_users table for community-specific bans
CREATE TABLE IF NOT EXISTS banned_users (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    reason TEXT,
    banned_by VARCHAR(36) NOT NULL,
    ban_expires_at TIMESTAMP NULL, -- NULL for permanent ban
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (banned_by) REFERENCES users(id)
);