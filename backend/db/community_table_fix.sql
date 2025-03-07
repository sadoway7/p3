-- Add missing columns to the community table
ALTER TABLE community ADD COLUMN IF NOT EXISTS privacy VARCHAR(50) DEFAULT 'public';
ALTER TABLE community ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE community ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE community ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT NULL;