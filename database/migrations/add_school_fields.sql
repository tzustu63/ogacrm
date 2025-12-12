-- Migration: Add new fields to schools table
-- Date: 2025-12-11

-- Add new columns to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS facebook VARCHAR(500),
ADD COLUMN IF NOT EXISTS instagram VARCHAR(500),
ADD COLUMN IF NOT EXISTS student_count INTEGER,
ADD COLUMN IF NOT EXISTS ownership VARCHAR(20) CHECK (ownership IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS has_mou BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update relationship_status enum to include new values
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction
-- We need to check if the values exist first
DO $$ 
BEGIN
    -- Check and add new relationship status values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'no_response' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'relationship_status')) THEN
        ALTER TYPE relationship_status ADD VALUE 'no_response';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'responded' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'relationship_status')) THEN
        ALTER TYPE relationship_status ADD VALUE 'responded';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'has_alumni' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'relationship_status')) THEN
        ALTER TYPE relationship_status ADD VALUE 'has_alumni';
    END IF;
END $$;

-- Update school_type enum to include technical_college if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'technical_college' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'school_type')) THEN
        ALTER TYPE school_type ADD VALUE 'technical_college';
    END IF;
END $$;

-- Update default relationship_status for existing rows
UPDATE schools 
SET relationship_status = 'no_response' 
WHERE relationship_status = 'potential' AND relationship_status NOT IN ('no_response', 'responded', 'has_alumni');
