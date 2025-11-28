# Audio Service

Converts news scripts to MP3 audio using YarnGPT TTS and uploads to Cloudflare R2.

## Setup

1. Install dependencies:
```bash
cd audio-service
npm install
```

2. Configure `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
YARNGPT_API_KEY=your_yarngpt_key
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET_NAME=nigerian-news-audio
R2_DOMAIN=cdn.r2.cloudflarestorage.com
```

## Usage

Process unpublished broadcasts:
```bash
npx ts-node src/queue.ts
```

## Modules

- **audio_generator.ts**: Generates MP3 audio using YarnGPT API
- **storage.ts**: Uploads audio files to Cloudflare R2
- **queue.ts**: Processes unpublished broadcasts from database

## Flow

1. Fetch unpublished broadcasts from Supabase
2. Generate audio for each broadcast using YarnGPT
3. Upload MP3 to R2 storage
4. Save audio metadata to database
5. Mark broadcast as published
