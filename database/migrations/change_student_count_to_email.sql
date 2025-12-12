-- Migration: Change student_count column to email
-- Date: 2025-12-11

-- Add email column
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Copy any existing data (if needed, you can migrate student_count to email, but typically they're different)
-- For now, we'll just add the new column and drop the old one

-- Drop the old student_count column
ALTER TABLE schools
DROP COLUMN IF EXISTS student_count;
