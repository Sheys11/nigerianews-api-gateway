# Monitoring & Verification Guide

This guide covers monitoring and verifying your Nigerian News Pipeline deployment.

## Quick Health Check

Run this anytime to check all services:

```bash
npm run health
```

**Output:**
```
========================================
   NIGERIAN NEWS PIPELINE - HEALTH CHECK
========================================

✅ Healthy Database (Supabase)
   Connected successfully
   Details: { tweets: 1250, broadcasts: 42, published: 38 }

✅ Healthy Scraper API
   Responding at https://nigerian-news-scraper-production.up.railway.app

✅ Healthy API Gateway
   Running at http://localhost:3000

✅ Healthy Gemini API
   API key valid

✅ Healthy R2 Storage
   Configuration present

========================================
Summary: 5 healthy, 0 warnings, 0 failed
========================================
```

## Pipeline Status

Check recent pipeline executions and statistics:

```bash
npm run status
```

**Shows:**
- Recent broadcasts (last 10)
- Tweet statistics (total, processed, unprocessed)
- Quality scores and validation rates
- Category breakdown
- Audio generation status
- Recent activity (last hour)

## Monitoring Checklist

### Daily Checks

- [ ] Run `npm run health` - All services healthy?
- [ ] Run `npm run status` - New broadcasts created?
- [ ] Check scraper is ingesting tweets
- [ ] Verify audio files are being generated

### Weekly Checks

- [ ] Review database size in Supabase dashboard
- [ ] Check R2 storage usage
- [ ] Review Gemini API quota usage
- [ ] Check for any failed broadcasts

### Monthly Checks

- [ ] Archive old tweets (>30 days)
- [ ] Review and optimize database indexes
- [ ] Check API rate limits
- [ ] Review costs and usage

## Monitoring on Railway

### View Logs

1. Go to Railway dashboard
2. Select your service
3. Click "Deployments" → "Logs"

**Look for:**
- `[SCRAPER] Ingested X new tweets` - Scraper working
- `[SUCCESS] Broadcast created` - Pipeline successful
- `[QUEUE] ✅ Broadcast X processed` - Audio generated
- Any `[ERROR]` or `[FATAL]` messages

### Set Up Alerts

Railway doesn't have built-in alerts, but you can:

1. **Use GitHub Actions** to run health checks
2. **Set up external monitoring** (UptimeRobot, Pingdom)
3. **Create a webhook** to notify on failures

## Database Monitoring

### Supabase Dashboard

1. Go to your Supabase project
2. Click "Database" → "Tables"

**Check:**
- `tweets` table - Growing regularly?
- `broadcasts` table - New entries every hour?
- `audio` table - Matching published broadcasts?

### Run SQL Queries

In Supabase SQL Editor:

```sql
-- Recent broadcasts
SELECT 
  id,
  broadcast_hour,
  total_tweets_used,
  is_published,
  created_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 10;

-- Tweet ingestion rate
SELECT 
  DATE(ingested_at) as date,
  COUNT(*) as tweets
FROM tweets
WHERE ingested_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(ingested_at)
ORDER BY date DESC;

-- Quality score distribution
SELECT 
  primary_category,
  COUNT(*) as total,
  SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as valid,
  ROUND(AVG(confidence_score)::numeric, 2) as avg_score
FROM tweet_quality
GROUP BY primary_category
ORDER BY total DESC;
```

## API Monitoring

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Latest broadcast
curl http://localhost:3000/broadcasts/latest

# All broadcasts (paginated)
curl "http://localhost:3000/broadcasts?page=1&limit=5"
```

### Expected Responses

**Healthy:**
```json
{
  "success": true,
  "message": "API is running",
  "database": "connected"
}
```

**Unhealthy:**
```json
{
  "success": false,
  "message": "Database unhealthy",
  "database": "disconnected"
}
```

## Troubleshooting

### No New Broadcasts

**Check:**
1. Are tweets being ingested? `npm run status`
2. Is pipeline cron job running? Check Railway logs
3. Are there unprocessed tweets? Check database

**Fix:**
- Manually run pipeline: `npx ts-node src/main.ts`
- Check scraper API is accessible
- Verify environment variables

### Audio Not Generated

**Check:**
1. Are there unpublished broadcasts? Check database
2. Is audio service cron running? Check Railway logs
3. Is YarnGPT API responding?

**Fix:**
- Manually run audio service: `cd audio-service && npx ts-node src/queue.ts`
- Check YarnGPT API key
- Verify R2 credentials

### Scraper Not Fetching Tweets

**Check:**
1. Is scraper API accessible? `npm run health`
2. Check scraper logs on Railway
3. Verify SCRAPER_API_URL is correct

**Fix:**
- Pipeline will continue with existing tweets
- Check scraper service deployment
- Verify scraper API endpoint

### Database Growing Too Fast

**Solution:**
```sql
-- Archive old tweets (run monthly)
DELETE FROM tweets 
WHERE ingested_at < NOW() - INTERVAL '30 days' 
AND processed = TRUE;
```

## Performance Metrics

### Expected Metrics

- **Pipeline execution:** 30-60 seconds
- **Audio generation:** 10-30 seconds per broadcast
- **API response time:** <100ms
- **Database queries:** <50ms

### Monitor Performance

Add to your monitoring:

```typescript
// In main.ts
const startTime = Date.now();
// ... pipeline execution ...
const duration = Date.now() - startTime;
console.log(`[PERF] Pipeline completed in ${duration}ms`);
```

## Automated Monitoring Script

Create `.github/workflows/monitor.yml`:

```yaml
name: Health Check
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - name: Run health check
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SCRAPER_API_URL: ${{ secrets.SCRAPER_API_URL }}
        run: npm run health
```

## Support & Debugging

If issues persist:

1. Check all environment variables are set
2. Review Railway deployment logs
3. Run health check: `npm run health`
4. Check Supabase logs
5. Verify API keys are valid

**Common Issues:**
- ❌ Missing env vars → Check `.env` files
- ❌ API timeouts → Check network/firewall
- ❌ Database errors → Check Supabase status
- ❌ Quota exceeded → Check API usage limits
