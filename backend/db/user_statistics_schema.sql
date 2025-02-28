-- Add user statistics columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS comment_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upvotes_received INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS downvotes_received INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upvotes_given INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS downvotes_given INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS communities_joined INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create user_friends table for tracking friendships
CREATE TABLE IF NOT EXISTS user_friends (
    user_id VARCHAR(36) NOT NULL,
    friend_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_achievements table for tracking achievements and badges
CREATE TABLE IF NOT EXISTS user_achievements (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user_activity_log for tracking user activity (optional, for analytics)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36), -- ID of the related entity (post, comment, etc.)
    entity_type VARCHAR(50), -- Type of the related entity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create triggers to automatically update user statistics

-- Update post_count when a post is created
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_post_insert
AFTER INSERT ON posts
FOR EACH ROW
BEGIN
    UPDATE users SET post_count = post_count + 1, last_active = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END //
DELIMITER ;

-- Update post_count when a post is deleted
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_post_delete
AFTER DELETE ON posts
FOR EACH ROW
BEGIN
    UPDATE users SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.user_id;
END //
DELIMITER ;

-- Update comment_count when a comment is created
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_comment_insert
AFTER INSERT ON comments
FOR EACH ROW
BEGIN
    UPDATE users SET comment_count = comment_count + 1, last_active = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END //
DELIMITER ;

-- Update comment_count when a comment is deleted
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_comment_delete
AFTER DELETE ON comments
FOR EACH ROW
BEGIN
    UPDATE users SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.user_id;
END //
DELIMITER ;

-- Update upvotes/downvotes when a vote is created or updated
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_vote_insert_update
AFTER INSERT ON votes
FOR EACH ROW
BEGIN
    DECLARE post_author_id VARCHAR(36);
    
    -- Get the post author
    SELECT user_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
    
    -- Update the voter's stats
    IF NEW.value = 1 THEN
        UPDATE users SET upvotes_given = upvotes_given + 1, last_active = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    ELSEIF NEW.value = -1 THEN
        UPDATE users SET downvotes_given = downvotes_given + 1, last_active = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END IF;
    
    -- Update the post author's stats
    IF NEW.value = 1 THEN
        UPDATE users SET upvotes_received = upvotes_received + 1
        WHERE id = post_author_id;
    ELSEIF NEW.value = -1 THEN
        UPDATE users SET downvotes_received = downvotes_received + 1
        WHERE id = post_author_id;
    END IF;
END //
DELIMITER ;

-- Update communities_joined when a user joins a community
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_community_member_insert
AFTER INSERT ON community_members
FOR EACH ROW
BEGIN
    UPDATE users SET communities_joined = communities_joined + 1, last_active = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END //
DELIMITER ;

-- Update communities_joined when a user leaves a community
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_community_member_delete
AFTER DELETE ON community_members
FOR EACH ROW
BEGIN
    UPDATE users SET communities_joined = GREATEST(0, communities_joined - 1)
    WHERE id = OLD.user_id;
END //
DELIMITER ;
