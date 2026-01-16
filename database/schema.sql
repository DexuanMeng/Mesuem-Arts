-- Museum Art Scanner Database Schema
-- Run this script in your Supabase SQL editor to set up the database

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Museums table
CREATE TABLE IF NOT EXISTS museums (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location POINT NOT NULL,  -- PostGIS point: (longitude, latitude)
    geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artworks table with vector embeddings
CREATE TABLE IF NOT EXISTS artworks (
    id SERIAL PRIMARY KEY,
    museum_id INTEGER REFERENCES museums(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    description_json JSONB,  -- Flexible JSON for descriptions, metadata, etc.
    image_url TEXT,
    embedding vector(512),  -- CLIP embedding vector (512 dimensions)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User scans table for logging interactions
CREATE TABLE IF NOT EXISTS user_scans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,  -- In production, reference auth.users
    artwork_id INTEGER REFERENCES artworks(id) ON DELETE SET NULL,
    image_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_artworks_museum_id ON artworks(museum_id);
CREATE INDEX IF NOT EXISTS idx_artworks_embedding ON artworks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_user_scans_user_id ON user_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scans_timestamp ON user_scans(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_museums_location ON museums USING GIST(location);

-- Sample data (optional - for testing)
-- Insert a sample museum
INSERT INTO museums (name, location, geofence_radius_meters) 
VALUES (
    'Metropolitan Museum of Art',
    POINT(-73.9631, 40.7794),  -- (longitude, latitude) for NYC
    200
) ON CONFLICT DO NOTHING;

-- Note: You'll need to populate artworks with actual data and embeddings
-- The embedding should be generated using CLIP model (512 dimensions)
