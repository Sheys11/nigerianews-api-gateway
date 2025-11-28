# Environment Setup Guide

This guide helps you configure all environment variables for the Nigerian News Pipeline.

## Overview

The project consists of 3 services, each requiring its own `.env` file:
1. Pipeline Service (root directory)
2. Audio Service (`audio-service/`)
3. API Gateway (`api-gateway/`)

## Step-by-Step Setup

### 1. Supabase Configuration (All Services)

**Get your credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to Settings → API
4. Copy `Project URL` and `anon/public` key

**Add to all three `.env` files:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Gemini API (Pipeline Service Only)

**Get your API key:**
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API key"
3. Create a new API key

**Add to root `.env`:**
```env
GEMINI_API_KEY=AIzaSy...
```

### 3. YarnGPT API (Audio Service Only)

**Get your API key:**
1. Contact YarnGPT for API access
2. Or use alternative TTS service (update `audio_generator.ts`)

**Add to `audio-service/.env`:**
```env
YARNGPT_API_KEY=your_yarngpt_key
```

### 4. Cloudflare R2 (Audio Service Only)

**Setup R2 bucket:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Create a bucket named `nigerian-news-audio`
4. Go to Manage R2 API Tokens
5. Create a new API token with read/write permissions

**Add to `audio-service/.env`:**
```env
R2_ACCESS_KEY=your_access_key_id
R2_SECRET_KEY=your_secret_access_key
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=nigerian-news-audio
R2_DOMAIN=pub-xxxxx.r2.dev
```

**Note**: The `R2_DOMAIN` is your bucket's public domain. Enable public access in R2 settings.

### 5. API Gateway Port (Optional)

**Add to `api-gateway/.env`:**
```env
PORT=3000
```

Change if port 3000 is already in use.

## Complete Configuration Files

### Root `.env` (Pipeline Service)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
```

### `audio-service/.env`
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
YARNGPT_API_KEY=your_yarngpt_key
R2_ACCESS_KEY=your_access_key_id
R2_SECRET_KEY=your_secret_access_key
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=nigerian-news-audio
R2_DOMAIN=pub-xxxxx.r2.dev
```

### `api-gateway/.env`
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
```

## Verification

After configuring all `.env` files:

1. **Test Pipeline Service:**
   ```bash
   npx ts-node src/verify_logic.ts
   ```
   Should show all tests passing.

2. **Test API Gateway:**
   ```bash
   cd api-gateway
   npx ts-node src/server.ts
   ```
   Then visit `http://localhost:3000/health`

3. **Test with Real Data:**
   ```bash
   # Run pipeline (requires tweets in database)
   npx ts-node src/main.ts
   
   # Generate audio (requires broadcasts in database)
   cd audio-service
   npx ts-node src/queue.ts
   ```

## Security Notes

- **Never commit `.env` files** - They're already in `.gitignore`
- **Use different keys** for development and production
- **Rotate keys** if they're exposed
- **Limit API key permissions** to only what's needed

## Troubleshooting

### "supabaseUrl is required"
- Check that `SUPABASE_URL` is set in the correct `.env` file
- Ensure no extra spaces or quotes around the value

### "Invalid API key" (Gemini)
- Verify your API key at [ai.google.dev](https://ai.google.dev)
- Check for any trailing spaces in `.env`

### R2 Upload Fails
- Verify bucket name matches exactly
- Check that API token has write permissions
- Ensure `R2_ACCOUNT_ID` is correct

### Port Already in Use
- Change `PORT` in `api-gateway/.env`
- Or stop the service using port 3000

## Next Steps

Once all environment variables are configured:
1. Run the verification tests
2. Test each service individually
3. Set up cron jobs for automation
4. Deploy to production
