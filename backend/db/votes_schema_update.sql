-- Rename the old votes table
RENAME TABLE votes TO votes_old;

-- Create the new votes table with support for both post and comment votes
CREATE TABLE votes (
    user_id VARCHAR(36) NOT NULL,
    post_id VARCHAR(36),
    comment_id VARCHAR(36),
    value TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, COALESCE(post_id, ''), COALESCE(comment_id, '')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (comment_id) REFERENCES comments(id),
    CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Migrate data from the old votes table
INSERT INTO votes (user_id, post_id, comment_id, value, created_at)
SELECT user_id, post_id, NULL, value, created_at FROM votes_old;

-- Drop the old votes table
DROP TABLE votes_old;
