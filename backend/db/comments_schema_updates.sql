-- Add parent_comment_id column to comments table for threaded replies
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(36) DEFAULT NULL;

-- Add foreign key constraint for parent_comment_id
ALTER TABLE comments ADD CONSTRAINT IF NOT EXISTS fk_parent_comment
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
    ON DELETE SET NULL;

-- Add profile_post column to posts table to distinguish between community posts and profile posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS profile_post BOOLEAN DEFAULT FALSE;

-- Add user_profile_id column to posts table for posts on user profiles
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_profile_id VARCHAR(36) DEFAULT NULL;

-- Add foreign key constraint for user_profile_id
ALTER TABLE posts ADD CONSTRAINT IF NOT EXISTS fk_user_profile
    FOREIGN KEY (user_profile_id) REFERENCES users(id)
    ON DELETE CASCADE;

-- Create index for faster comment retrieval by post_id
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Create index for faster comment retrieval by parent_comment_id
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);

-- Create index for faster post retrieval by user_profile_id
CREATE INDEX IF NOT EXISTS idx_posts_user_profile ON posts(user_profile_id);
