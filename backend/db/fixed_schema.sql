-- New database schema for rumfornew2
-- Addressing issues with the current database:
-- 1. Data duplication
-- 2. Missing activity tracking
-- 3. Inconsistent naming conventions
-- 4. Missing personal information

-- Core user table with essential information only
CREATE TABLE user (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    secondary_email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    display_name VARCHAR(100),
    date_of_birth DATE,
    role VARCHAR(20) DEFAULT 'user',
    bio TEXT,
    avatar_url VARCHAR(255),
    profile_banner_url VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    cake_day TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User addresses
CREATE TABLE user_address (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    address_type VARCHAR(20) NOT NULL, -- 'home', 'work', etc.
    country VARCHAR(50),
    county VARCHAR(50),
    city VARCHAR(50),
    street VARCHAR(100),
    street_number INT,
    building VARCHAR(10),
    floor INT,
    apartment_number INT,
    postal_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- User statistics (single source of truth for all user stats)
CREATE TABLE user_statistic (
    user_id VARCHAR(36) PRIMARY KEY,
    karma INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    upvotes_received INT DEFAULT 0,
    downvotes_received INT DEFAULT 0,
    upvotes_given INT DEFAULT 0,
    downvotes_given INT DEFAULT 0,
    communities_joined INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- User settings
CREATE TABLE user_setting (
    user_id VARCHAR(36) PRIMARY KEY,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'light',
    content_filter VARCHAR(20) DEFAULT 'standard',
    allow_followers BOOLEAN DEFAULT TRUE,
    display_online_status BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- User relationships
CREATE TABLE user_relationship (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    related_user_id VARCHAR(36) NOT NULL,
    relationship_type VARCHAR(20) NOT NULL, -- 'friend', 'follow', 'block'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, related_user_id, relationship_type)
);

-- User achievements
CREATE TABLE user_achievement (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Community table
CREATE TABLE community (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    privacy VARCHAR(10) DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Community members
CREATE TABLE community_member (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'moderator', 'admin'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Community rules
CREATE TABLE community_rule (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE
);

-- Community settings
CREATE TABLE community_setting (
    community_id VARCHAR(36) PRIMARY KEY,
    allow_post_images BOOLEAN DEFAULT TRUE,
    allow_post_links BOOLEAN DEFAULT TRUE,
    join_method VARCHAR(20) DEFAULT 'auto_approve', -- 'auto_approve', 'requires_approval', 'invite_only'
    require_post_approval BOOLEAN DEFAULT FALSE,
    restricted_words TEXT,
    custom_theme_color VARCHAR(20),
    custom_banner_url TEXT,
    minimum_account_age_days INT DEFAULT 0,
    minimum_karma_required INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE
);

-- Community join requests
CREATE TABLE community_join_request (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- User flair for communities
CREATE TABLE user_flair (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    community_id VARCHAR(36) NOT NULL,
    text VARCHAR(50) NOT NULL,
    background_color VARCHAR(20) DEFAULT '#e0e0e0',
    text_color VARCHAR(20) DEFAULT '#000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, community_id)
);

-- Post table
CREATE TABLE post (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    community_id VARCHAR(36) NOT NULL,
    profile_post BOOLEAN DEFAULT FALSE,
    user_profile_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_profile_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Comment table
CREATE TABLE comment (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    post_id VARCHAR(36) NOT NULL,
    parent_comment_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comment(id) ON DELETE SET NULL
);

-- Vote table with support for both post and comment votes
CREATE TABLE vote (
    user_id VARCHAR(36) NOT NULL,
    post_id VARCHAR(36),
    comment_id VARCHAR(36),
    value TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, IFNULL(post_id, ''), IFNULL(comment_id, '')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE,
    CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Saved items
CREATE TABLE saved_item (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- 'post', 'comment'
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collection_name VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Moderator permissions
CREATE TABLE moderator_permission (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    can_manage_settings BOOLEAN DEFAULT FALSE,
    can_manage_members BOOLEAN DEFAULT FALSE, 
    can_manage_posts BOOLEAN DEFAULT FALSE,
    can_manage_comments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Post moderation
CREATE TABLE post_moderation (
    post_id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    moderator_id VARCHAR(36),
    reason TEXT,
    moderated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES user(id) ON DELETE SET NULL
);

-- Banned users
CREATE TABLE banned_user (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    reason TEXT,
    banned_by VARCHAR(36) NOT NULL,
    ban_expires_at TIMESTAMP NULL, -- NULL for permanent ban
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES user(id) ON DELETE CASCADE
);

-- Activity types
CREATE TABLE activity_type (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Actions
CREATE TABLE action (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activities
CREATE TABLE activity (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    activity_type_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36), -- ID of the related entity (post, comment, community, etc.)
    entity_type VARCHAR(50), -- Type of the related entity (post, comment, community, etc.)
    metadata JSON, -- Additional data related to the activity
    ip_address VARCHAR(45), -- IPv4 or IPv6 address
    user_agent TEXT, -- Browser/client information
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_type_id) REFERENCES activity_type(id),
    FOREIGN KEY (action_id) REFERENCES action(id)
);

-- Moderation logs
CREATE TABLE moderation_log (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL,
    moderator_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'approve_post', 'remove_post', 'ban_user', etc.
    target_id VARCHAR(36), -- ID of the post, comment, or user that was acted upon
    target_type VARCHAR(20), -- 'post', 'comment', 'user', etc.
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_post_user_id ON post(user_id);
CREATE INDEX idx_post_community_id ON post(community_id);
CREATE INDEX idx_comment_post_id ON comment(post_id);
CREATE INDEX idx_comment_user_id ON comment(user_id);
CREATE INDEX idx_comment_parent_id ON comment(parent_comment_id);
CREATE INDEX idx_vote_post_id ON vote(post_id);
CREATE INDEX idx_vote_comment_id ON vote(comment_id);
CREATE INDEX idx_activity_user_id ON activity(user_id);
CREATE INDEX idx_activity_type_id ON activity(activity_type_id);
CREATE INDEX idx_activity_action_id ON activity(action_id);
CREATE INDEX idx_activity_entity ON activity(entity_id, entity_type);

-- Insert default activity types
INSERT INTO activity_type (id, name, description) VALUES
(UUID(), 'POST', 'Activities related to posts'),
(UUID(), 'COMMENT', 'Activities related to comments'),
(UUID(), 'VOTE', 'Activities related to voting'),
(UUID(), 'COMMUNITY', 'Activities related to communities'),
(UUID(), 'USER', 'Activities related to user accounts'),
(UUID(), 'MODERATION', 'Activities related to moderation actions'),
(UUID(), 'SYSTEM', 'System-level activities');

-- Insert default actions
INSERT INTO action (id, name, description) VALUES
(UUID(), 'CREATE', 'Creating a new entity'),
(UUID(), 'READ', 'Viewing or reading content'),
(UUID(), 'UPDATE', 'Updating existing content'),
(UUID(), 'DELETE', 'Deleting content'),
(UUID(), 'UPVOTE', 'Upvoting content'),
(UUID(), 'DOWNVOTE', 'Downvoting content'),
(UUID(), 'JOIN', 'Joining a community'),
(UUID(), 'LEAVE', 'Leaving a community'),
(UUID(), 'LOGIN', 'User login'),
(UUID(), 'LOGOUT', 'User logout'),
(UUID(), 'REGISTER', 'User registration'),
(UUID(), 'MODERATE', 'Moderation action'),
(UUID(), 'REPORT', 'Reporting content'),
(UUID(), 'APPROVE', 'Approving content'),
(UUID(), 'REJECT', 'Rejecting content'),
(UUID(), 'BAN', 'Banning a user'),
(UUID(), 'UNBAN', 'Unbanning a user');
