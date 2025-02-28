-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Ensure community_members table has role column
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';

-- Create initial admin user (will be executed via a separate script)
-- INSERT INTO users (id, username, email, password_hash, role) 
-- VALUES ('admin-uuid', 'admin', 'admin@example.com', 'hashed-password', 'admin');
