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
    address_type VARCHAR(20) NOT NULL,
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

-- Community table
CREATE TABLE community (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    privacy VARCHAR(10) DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Community settings
CREATE TABLE community_setting (
    community_id VARCHAR(36) PRIMARY KEY,
    allow_post_images BOOLEAN DEFAULT TRUE,
    allow_post_links BOOLEAN DEFAULT TRUE,
    join_method VARCHAR(20) DEFAULT 'auto_approve',
    require_post_approval BOOLEAN DEFAULT FALSE,
    restricted_words TEXT,
    custom_theme_color VARCHAR(20),
    custom_banner_url TEXT,
    minimum_account_age_days INT DEFAULT 0,
    minimum_karma_required INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE
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

-- Community members
CREATE TABLE community_member (
    community_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
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
    entity_id VARCHAR(36),
    entity_type VARCHAR(50),
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_type_id) REFERENCES activity_type(id),
    FOREIGN KEY (action_id) REFERENCES action(id)
);

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
