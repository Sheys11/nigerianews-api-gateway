# Scraper API Integration

The pipeline now automatically fetches tweets from the Nigerian news scraper before processing.

## Configuration

Add this to your `.env` file:

```bash
# Optional - defaults to the Railway deployment
SCRAPER_API_URL=https://nigerian-news-scraper-production.up.railway.app
```

## How It Works

### Pipeline Flow

1. **Stage 0: Ingest Tweets** (NEW)
   - Fetches latest tweets from scraper API
   - Stores new tweets in database
   - Skips duplicates automatically

2. **Stage 1: Filter & Score**
   - Processes tweets from database
   - Scores quality and categorizes

3. **Stage 2-4: Cluster, Summarize, Generate**
   - Creates broadcast script

### API Endpoints Used

The scraper integration tries these endpoints:

- `GET /api/tweets?limit=200` - Fetch latest tweets
- `GET /api/tweets?start={ISO_DATE}&end={ISO_DATE}` - Fetch by time range

### Response Format

Expected scraper API response:

```json
{
  "success": true,
  "data": [
    {
      "tweet_id": "1234567890",
      "author": "username",
      "author_verified": true,
      "content": "Tweet text...",
      "timestamp": "2025-11-28T12:00:00Z",
      "retweet_count": 42
    }
  ]
}
```

## Error Handling

- If scraper API is unavailable, pipeline continues with existing database tweets
- Duplicate tweets are automatically skipped
- Failed insertions are logged but don't stop the process

## Logs

Watch for these log messages:

```
[SCRAPER] Fetching tweets from https://...
[SCRAPER] Fetched 150 tweets
[SCRAPER] Ingested 120/150 new tweets (30 duplicates skipped)
```

## Testing

Test the scraper integration:

```bash
# Run pipeline manually
npx ts-node src/main.ts
```

Expected output:
```
========== PIPELINE EXECUTION pipeline-1234567890 ==========

[PIPELINE] Fetching latest tweets from scraper...
[SCRAPER] Fetching tweets from https://nigerian-news-scraper-production.up.railway.app
[SCRAPER] Fetched 150 tweets
[SCRAPER] Ingested 120 new tweets

[FILTER] Starting quality scoring...
```

## Deployment

On Railway, the pipeline will:
1. Run every hour via cron: `0 * * * *`
2. Fetch fresh tweets from scraper
3. Process and generate broadcasts
4. Store results in database

No additional configuration needed - it works automatically!
