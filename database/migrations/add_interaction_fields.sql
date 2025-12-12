-- Migration: Add new fields to interactions table
-- Date: 2025-12-12
-- Fields: subject (主題), contact_id (聯絡人ID), tzu_contact (慈大聯絡人)

-- Add subject column
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS subject VARCHAR(255);

-- Add contact_id column (foreign key to contacts table)
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add tzu_contact column (慈大聯絡人)
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS tzu_contact VARCHAR(255);

-- Update contact_method enum to include new methods
DO $$ 
BEGIN
    -- Check if enum value exists before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'facebook' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contact_method')) THEN
        ALTER TYPE contact_method ADD VALUE 'facebook';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instagram' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contact_method')) THEN
        ALTER TYPE contact_method ADD VALUE 'instagram';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'whatsapp' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contact_method')) THEN
        ALTER TYPE contact_method ADD VALUE 'whatsapp';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'meeting' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contact_method')) THEN
        ALTER TYPE contact_method ADD VALUE 'meeting';
    END IF;
END $$;


