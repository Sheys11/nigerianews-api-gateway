# Nigerian News Pipeline

Automated news aggregation system that collects tweets, generates news scripts, converts to audio, and serves via REST API.

## Project Structure

```
nigerian-news-pipeline/
├── src/                    # Phase 2: Pipeline Service
│   ├── main.ts            # Main pipeline orchestrator
│   └── verify_logic.ts    # Logic verification tests
├── audio-service/          # Phase 3: Audio Service
│   └── src/
│       ├── audio_generator.ts  # YarnGPT TTS integration
│       ├── storage.ts          # Cloudflare R2 uploads
│       └── queue.ts            # Audio queue processor
├── api-gateway/            # Phase 4: API Gateway
│   └── src/
│       └── server.ts      # Express REST API
└── README.md              # This file
```

## System Overview

```
Tweets (100/hour)
    ↓
Pipeline Service (src/main.ts)
    ↓ Filter & Score (60-70 valid)
    ↓ Cluster by category (8 clusters)
    ↓ Summarize with Gemini AI
    ↓ Generate script (150-300 words)
    ↓
Supabase Database (broadcasts table)
    ↓
Audio Service (audio-service/src/queue.ts)
    ↓ Generate MP3 with YarnGPT
    ↓ Upload to Cloudflare R2
    ↓
API Gateway (api-gateway/src/server.ts)
    ↓
Frontend Application
```

## Quick Start

### 1. Install Dependencies

```bash
# Pipeline service
npm install

# Audio service
cd audio-service && npm install && cd ..

# API gateway
cd api-gateway && npm install && cd ..
```

### 2. Configure Environment Variables

Create `.env` files in each directory:

**Root `.env` (Pipeline Service):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
```

**`audio-service/.env`:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
YARNGPT_API_KEY=your_yarngpt_api_key
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET_NAME=nigerian-news-audio
R2_DOMAIN=cdn.r2.cloudflarestorage.com
```

**`api-gateway/.env`:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000
```

### 3. Database Setup

Required Supabase tables:
- `tweets` - Raw tweet data
- `tweet_quality` - Quality scores
- `categories` - News categories
- `broadcasts` - Generated scripts
- `audio` - Audio metadata

### 4. Run Services

**Pipeline Service** (processes tweets → scripts):
```bash
npx ts-node src/main.ts
```

**Audio Service** (scripts → MP3):
```bash
cd audio-service
npx ts-node src/queue.ts
```

**API Gateway** (serves data to frontend):
```bash
cd api-gateway
npx ts-node src/server.ts
```

**Verification Tests**:
```bash
npx ts-node src/verify_logic.ts
```

## Service Details

### Phase 2: Pipeline Service
- **Location**: `src/main.ts`
- **Purpose**: Processes raw tweets into news scripts
- **Stages**:
  1. Filter & Score tweets (quality validation)
  2. Cluster by category (8 categories)
  3. Summarize with Gemini AI
  4. Generate broadcast script
- **Output**: Saves to `broadcasts` table in Supabase

### Phase 3: Audio Service
- **Location**: `audio-service/src/queue.ts`
- **Purpose**: Converts scripts to MP3 audio
- **Process**:
  1. Fetch unpublished broadcasts
  2. Generate audio with YarnGPT
  3. Upload to Cloudflare R2
  4. Save metadata to `audio` table
- **Voices**: Idera (default), Femi, Chinenye

### Phase 4: API Gateway
- **Location**: `api-gateway/src/server.ts`
- **Purpose**: REST API for frontend
- **Endpoints**:
  - `GET /health` - Health check
  - `GET /broadcasts/latest` - Latest broadcast
  - `GET /broadcasts/:id` - Specific broadcast
  - `GET /broadcasts` - All broadcasts (paginated)
- **Features**: CORS, rate limiting (100 req/min), error handling

## Development

### Testing Logic
```bash
npx ts-node src/verify_logic.ts
```

Tests:
- ✅ Tweet categorization
- ✅ Quality scoring
- ✅ Clustering
- ✅ Script generation

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Latest broadcast
curl http://localhost:3000/broadcasts/latest

# Specific broadcast
curl http://localhost:3000/broadcasts/1

# Paginated list
curl "http://localhost:3000/broadcasts?page=1&limit=10"
```

## Deployment

### Recommended Platforms
- **Pipeline & Audio**: Railway, Render, or Fly.io
- **API Gateway**: Vercel, Railway, or Render
- **Database**: Supabase (already configured)
- **Storage**: Cloudflare R2 (already configured)

### Cron Jobs
Set up automated execution:
- **Pipeline**: Every hour (e.g., `0 * * * *`)
- **Audio**: 10 minutes after pipeline (e.g., `10 * * * *`)

Example GitHub Actions workflow:
```yaml
name: Pipeline Hourly
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npx ts-node src/main.ts
```

## Categories

The system processes news in 8 categories:
1. **Politics** - Elections, government, parliament
2. **Security** - Military, terrorism, defense
3. **Health** - Disease, hospitals, vaccines
4. **Economy** - Business, markets, trade, naira
5. **Education** - Schools, universities, students
6. **Energy** - Power, oil, electricity, gas
7. **Technology** - Startups, AI, software, digital
8. **Social** - Community, society, culture

## Environment Variables Reference

| Variable | Service | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_KEY` | All | Supabase API key |
| `GEMINI_API_KEY` | Pipeline | Google Gemini API key |
| `YARNGPT_API_KEY` | Audio | YarnGPT TTS API key |
| `R2_ACCESS_KEY` | Audio | Cloudflare R2 access key |
| `R2_SECRET_KEY` | Audio | Cloudflare R2 secret key |
| `R2_ACCOUNT_ID` | Audio | Cloudflare R2 account ID |
| `R2_BUCKET_NAME` | Audio | R2 bucket name |
| `R2_DOMAIN` | Audio | R2 public domain |
| `PORT` | API | API server port (default: 3000) |

## Troubleshooting

### Pipeline Issues
- **No tweets found**: Check scraper is running and populating `tweets` table
- **Gemini API errors**: Verify `GEMINI_API_KEY` is valid
- **No valid tweets**: Adjust quality thresholds in `scoreTweet()`

### Audio Issues
- **YarnGPT errors**: Verify `YARNGPT_API_KEY` and endpoint URL
- **R2 upload fails**: Check R2 credentials and bucket permissions
- **No broadcasts to process**: Run pipeline first

### API Issues
- **CORS errors**: Update `origin` in `server.ts` for your frontend domain
- **Rate limiting**: Adjust `max` in rate limiter configuration
- **404 errors**: Check Supabase connection and table names

## License

ISC

## Support

For issues or questions, check the individual service READMEs:
- [Pipeline Service](./src/README.md)
- [Audio Service](./audio-service/README.md)
- [API Gateway](./api-gateway/README.md)
