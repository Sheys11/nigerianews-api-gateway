-- ============================================================================
-- Nigerian News Pipeline - Database Schema
-- ============================================================================
-- This SQL creates all tables required for the pipeline system
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. TWEETS TABLE
-- Stores raw tweets from the scraper
-- ============================================================================
CREATE TABLE IF NOT EXISTS tweets (
    id BIGSERIAL PRIMARY KEY,
    tweet_id TEXT UNIQUE NOT NULL,
    author TEXT NOT NULL,
    author_verified BOOLEAN DEFAULT FALSE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    retweet_count INTEGER DEFAULT 0,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tweets_ingested_at ON tweets(ingested_at);
CREATE INDEX IF NOT EXISTS idx_tweets_processed ON tweets(processed);
CREATE INDEX IF NOT EXISTS idx_tweets_tweet_id ON tweets(tweet_id);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- Defines news categories and their thresholds
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    min_sources INTEGER DEFAULT 1,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.6,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description, min_sources, confidence_threshold) VALUES
    ('Politics', 'Elections, government, parliament, ministers', 2, 0.6),
    ('Security', 'Military, terrorism, defense, attacks', 2, 0.7),
    ('Health', 'Disease, hospitals, vaccines, healthcare', 1, 0.6),
    ('Economy', 'Business, markets, trade, naira, GDP', 2, 0.6),
    ('Education', 'Schools, universities, students, learning', 1, 0.6),
    ('Energy', 'Power, oil, electricity, gas, fuel', 2, 0.6),
    ('Technology', 'Startups, AI, software, digital, apps', 1, 0.5),
    ('Social', 'Community, society, culture, life, family', 1, 0.5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. TWEET_QUALITY TABLE
-- Stores quality scores for each tweet
-- ============================================================================
CREATE TABLE IF NOT EXISTS tweet_quality (
    id BIGSERIAL PRIMARY KEY,
    tweet_id TEXT UNIQUE NOT NULL REFERENCES tweets(tweet_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    primary_category TEXT NOT NULL,
    secondary_categories TEXT[] DEFAULT '{}',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tweet_quality_tweet_id ON tweet_quality(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_quality_is_valid ON tweet_quality(is_valid);
CREATE INDEX IF NOT EXISTS idx_tweet_quality_primary_category ON tweet_quality(primary_category);

-- ============================================================================
-- 4. BROADCASTS TABLE
-- Stores generated news scripts
-- ============================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
    id BIGSERIAL PRIMARY KEY,
    broadcast_hour TIMESTAMPTZ UNIQUE NOT NULL,
    full_script TEXT NOT NULL,
    summary_text TEXT,
    cluster_count INTEGER DEFAULT 0,
    total_tweets_used INTEGER DEFAULT 0,
    script_word_count INTEGER DEFAULT 0,
    estimated_audio_duration_seconds INTEGER,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_broadcast_hour ON broadcasts(broadcast_hour DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_is_published ON broadcasts(is_published);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);

-- ============================================================================
-- 5. AUDIO TABLE
-- Stores audio file metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS audio (
    id BIGSERIAL PRIMARY KEY,
    broadcast_id BIGINT UNIQUE NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT,
    voice_used TEXT DEFAULT 'Idera',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audio_broadcast_id ON audio(broadcast_id);

-- ============================================================================
-- 6. CLUSTERS TABLE (Optional - for detailed tracking)
-- Stores individual cluster information
-- ============================================================================
CREATE TABLE IF NOT EXISTS clusters (
    id BIGSERIAL PRIMARY KEY,
    broadcast_id BIGINT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    primary_category TEXT NOT NULL,
    tweet_ids TEXT[] NOT NULL,
    summary TEXT NOT NULL,
    source_accounts TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_clusters_broadcast_id ON clusters(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_clusters_primary_category ON clusters(primary_category);

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Latest published broadcasts with audio
CREATE OR REPLACE VIEW v_published_broadcasts AS
SELECT 
    b.id,
    b.broadcast_hour,
    b.full_script,
    b.summary_text,
    b.cluster_count,
    b.total_tweets_used,
    b.script_word_count,
    b.estimated_audio_duration_seconds,
    b.created_at,
    a.audio_url,
    a.duration_seconds,
    a.voice_used,
    a.file_size_bytes
FROM broadcasts b
LEFT JOIN audio a ON b.id = a.broadcast_id
WHERE b.is_published = TRUE
ORDER BY b.broadcast_hour DESC;

-- View: Tweet statistics by category
CREATE OR REPLACE VIEW v_tweet_stats_by_category AS
SELECT 
    tq.primary_category,
    COUNT(*) as total_tweets,
    SUM(CASE WHEN tq.is_valid THEN 1 ELSE 0 END) as valid_tweets,
    AVG(tq.confidence_score) as avg_confidence,
    COUNT(DISTINCT t.author) as unique_authors
FROM tweet_quality tq
JOIN tweets t ON tq.tweet_id = t.tweet_id
GROUP BY tq.primary_category
ORDER BY total_tweets DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: Auto-update updated_at on broadcasts
DROP TRIGGER IF EXISTS update_broadcasts_updated_at ON broadcasts;
CREATE TRIGGER update_broadcasts_updated_at
    BEFORE UPDATE ON broadcasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - for production)
-- ============================================================================

-- Enable RLS on all tables
-- ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tweet_quality ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audio ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust based on your needs)
-- CREATE POLICY "Public read access" ON broadcasts FOR SELECT USING (is_published = TRUE);
-- CREATE POLICY "Service role full access" ON broadcasts FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing

/*
-- Sample tweet
INSERT INTO tweets (tweet_id, author, author_verified, content, timestamp, retweet_count, processed)
VALUES 
    ('1234567890', 'NewsAgency', TRUE, 'Breaking: The government announced a new policy on education today. #Nigeria #Education', NOW() - INTERVAL '1 hour', 150, FALSE);

-- Sample quality score
INSERT INTO tweet_quality (tweet_id, is_valid, confidence_score, primary_category, secondary_categories)
VALUES 
    ('1234567890', TRUE, 0.85, 'Education', ARRAY['Politics']);

-- Sample broadcast
INSERT INTO broadcasts (broadcast_hour, full_script, summary_text, cluster_count, total_tweets_used, script_word_count, estimated_audio_duration_seconds, is_published)
VALUES 
    (NOW(), 'Good afternoon. This is the Nigerian News Brief for today...', 'Education policy announced', 3, 15, 250, 100, FALSE);
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tweets', 'categories', 'tweet_quality', 'broadcasts', 'audio', 'clusters')
ORDER BY table_name;

-- Check categories are populated
SELECT * FROM categories ORDER BY name;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Archive old tweets (run periodically)
-- DELETE FROM tweets WHERE ingested_at < NOW() - INTERVAL '30 days' AND processed = TRUE;

-- Get database size
-- SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Get table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
