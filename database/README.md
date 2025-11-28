# Database Setup Guide

This guide explains how to set up the Supabase database for the Nigerian News Pipeline.

## Quick Setup

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run the Schema**
   - Copy the entire contents of `schema.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

3. **Verify Setup**
   - Check that all 6 tables were created
   - Verify that 8 categories were inserted
   - Check the verification queries at the bottom

## Tables Overview

### 1. `tweets`
Stores raw tweets from the scraper.

**Columns:**
- `id` - Auto-incrementing primary key
- `tweet_id` - Unique Twitter ID
- `author` - Tweet author username
- `author_verified` - Whether author is verified
- `content` - Tweet text
- `timestamp` - When tweet was posted
- `retweet_count` - Number of retweets
- `ingested_at` - When tweet was scraped
- `processed` - Whether pipeline has processed this tweet

### 2. `categories`
Defines the 8 news categories.

**Pre-populated with:**
- Politics
- Security
- Health
- Economy
- Education
- Energy
- Technology
- Social

### 3. `tweet_quality`
Stores quality scores for each tweet.

**Columns:**
- `tweet_id` - References tweets table
- `is_valid` - Whether tweet passed quality checks
- `confidence_score` - Quality score (0-1)
- `primary_category` - Main category
- `secondary_categories` - Additional categories
- `rejection_reason` - Why tweet was rejected (if applicable)

### 4. `broadcasts`
Stores generated news scripts.

**Columns:**
- `id` - Broadcast ID
- `broadcast_hour` - Hour this broadcast is for
- `full_script` - Complete news script
- `summary_text` - Short summary
- `cluster_count` - Number of clusters used
- `total_tweets_used` - Number of tweets processed
- `script_word_count` - Word count
- `estimated_audio_duration_seconds` - Estimated duration
- `is_published` - Whether audio has been generated

### 5. `audio`
Stores audio file metadata.

**Columns:**
- `broadcast_id` - References broadcasts table
- `audio_url` - URL to MP3 file on R2
- `duration_seconds` - Actual audio duration
- `file_size_bytes` - File size
- `voice_used` - TTS voice used

### 6. `clusters` (Optional)
Stores detailed cluster information for analytics.

## Views

### `v_published_broadcasts`
Combines broadcasts and audio data for easy querying.

**Usage:**
```sql
SELECT * FROM v_published_broadcasts LIMIT 10;
```

### `v_tweet_stats_by_category`
Shows statistics by category.

**Usage:**
```sql
SELECT * FROM v_tweet_stats_by_category;
```

## Common Queries

### Get Latest Broadcast
```sql
SELECT * FROM v_published_broadcasts 
ORDER BY broadcast_hour DESC 
LIMIT 1;
```

### Get Broadcast by ID
```sql
SELECT 
    b.*,
    a.audio_url,
    a.duration_seconds,
    a.voice_used
FROM broadcasts b
LEFT JOIN audio a ON b.id = a.broadcast_id
WHERE b.id = 1;
```

### Get Unpublished Broadcasts
```sql
SELECT * FROM broadcasts 
WHERE is_published = FALSE 
ORDER BY broadcast_hour ASC;
```

### Get Tweet Quality Stats
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as valid,
    AVG(confidence_score) as avg_score
FROM tweet_quality;
```

### Get Broadcasts by Date Range
```sql
SELECT * FROM v_published_broadcasts
WHERE broadcast_hour BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY broadcast_hour DESC;
```

## Maintenance

### Archive Old Tweets
Run this periodically to keep database size manageable:

```sql
DELETE FROM tweets 
WHERE ingested_at < NOW() - INTERVAL '30 days' 
AND processed = TRUE;
```

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### Check Table Sizes
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

## Indexes

The schema includes indexes on frequently queried columns:
- `tweets.ingested_at` - For time-based queries
- `tweets.processed` - For finding unprocessed tweets
- `broadcasts.broadcast_hour` - For chronological queries
- `broadcasts.is_published` - For finding unpublished broadcasts
- `tweet_quality.primary_category` - For category filtering

## Row Level Security (RLS)

The schema includes commented-out RLS policies. To enable:

1. Uncomment the RLS enable statements
2. Uncomment the policy statements
3. Adjust policies based on your security needs

**Example:**
```sql
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published" 
ON broadcasts FOR SELECT 
USING (is_published = TRUE);

CREATE POLICY "Service role full access" 
ON broadcasts FOR ALL 
USING (auth.role() = 'service_role');
```

## Troubleshooting

### "relation already exists"
- Tables already created, safe to ignore
- Or drop tables first: `DROP TABLE IF EXISTS table_name CASCADE;`

### "permission denied"
- Make sure you're using the service role key
- Or run as database owner in Supabase SQL Editor

### "foreign key violation"
- Ensure parent records exist before inserting child records
- Example: Create broadcast before creating audio

## Backup

Supabase automatically backs up your database. To create manual backup:

1. Go to Database → Backups in Supabase dashboard
2. Click "Create backup"
3. Download if needed

## Migration

If you need to modify the schema later:

1. Create a new SQL file (e.g., `migration_001.sql`)
2. Add your ALTER TABLE statements
3. Run in SQL Editor
4. Document changes

**Example migration:**
```sql
-- Add new column to broadcasts
ALTER TABLE broadcasts 
ADD COLUMN featured BOOLEAN DEFAULT FALSE;

-- Create index
CREATE INDEX idx_broadcasts_featured 
ON broadcasts(featured);
```
