-- Migration: Add new fields to contacts table
-- Date: 2025-12-11
-- Fields: organization (單位), facebook (FB), instagram (IG), whatsapp (WhatsApp), notes (備註)

-- Add organization column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

-- Add facebook column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS facebook VARCHAR(255);

-- Add instagram column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);

-- Add whatsapp column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(255);

-- Add notes column
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS notes TEXT;


