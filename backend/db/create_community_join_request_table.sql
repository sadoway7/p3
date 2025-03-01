-- Create community join requests table
CREATE TABLE IF NOT EXISTS community_join_request (
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

-- Add indexes for faster lookups
CREATE INDEX idx_join_request_community_id ON community_join_request(community_id);
CREATE INDEX idx_join_request_user_id ON community_join_request(user_id);
CREATE INDEX idx_join_request_status ON community_join_request(status);