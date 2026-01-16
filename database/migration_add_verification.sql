-- Migration: Add verification and source tracking to artworks table
-- Run this in your Supabase SQL Editor

-- Add new columns to artworks table
ALTER TABLE artworks
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'ai_generated',
ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- Add index on is_verified for faster queries
CREATE INDEX IF NOT EXISTS idx_artworks_is_verified ON artworks(is_verified);

-- Add index on source for filtering
CREATE INDEX IF NOT EXISTS idx_artworks_source ON artworks(source);

-- Update existing records to have default values
UPDATE artworks
SET 
    is_verified = COALESCE(is_verified, false),
    source = COALESCE(source, 'admin')  -- Assume existing records are from admin
WHERE is_verified IS NULL OR source IS NULL;

-- Add check constraint for source values
ALTER TABLE artworks
ADD CONSTRAINT check_source_values 
CHECK (source IN ('museum_api', 'ai_generated', 'admin', 'community'));

-- Add check constraint for confidence_score range
ALTER TABLE artworks
ADD CONSTRAINT check_confidence_range 
CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

-- Comments for documentation
COMMENT ON COLUMN artworks.is_verified IS 'Whether this artwork data has been verified by a museum or admin';
COMMENT ON COLUMN artworks.source IS 'Source of the artwork data: museum_api, ai_generated, admin, or community';
COMMENT ON COLUMN artworks.confidence_score IS 'Confidence score (0-1) for AI-generated entries';
