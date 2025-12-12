-- Migration: Add follow-up report field to interactions table
-- Date: 2025-12-12
-- Field: follow_up_report (回報) - TEXT field for follow-up reporting

-- Add follow_up_report column
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS follow_up_report TEXT;
