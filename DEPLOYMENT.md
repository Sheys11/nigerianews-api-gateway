# Deployment Guide

This guide covers deploying all services to production.

## Deployment Strategy

We recommend deploying each service separately:
- **Pipeline Service** → Railway or Render (with cron)
- **Audio Service** → Railway or Render (with cron)
- **API Gateway** → Vercel or Railway
- **Database** → Supabase (already hosted)
- **Storage** → Cloudflare R2 (already hosted)

## Option 1: Railway Deployment

### Prerequisites
1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

### Deploy Pipeline Service

```bash
# From project root
railway init
railway up

# Add environment variables
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_KEY=your_key
railway variables set GEMINI_API_KEY=your_key

# Set up cron (in Railway dashboard)
# Cron Expression: 0 * * * * (every hour)
# Command: npx ts-node src/main.ts
```

### Deploy Audio Service

```bash
cd audio-service
railway init
railway up

# Add environment variables
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_KEY=your_key
railway variables set YARNGPT_API_KEY=your_key
railway variables set R2_ACCESS_KEY=your_key
railway variables set R2_SECRET_KEY=your_key
railway variables set R2_ACCOUNT_ID=your_id
railway variables set R2_BUCKET_NAME=nigerian-news-audio
railway variables set R2_DOMAIN=your_domain

# Set up cron (in Railway dashboard)
# Cron Expression: 10 * * * * (10 min after pipeline)
# Command: npx ts-node src/queue.ts
```

### Deploy API Gateway

```bash
cd api-gateway
railway init
railway up

# Add environment variables
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_KEY=your_key
railway variables set PORT=3000

# Railway will automatically keep the server running
```

## Option 2: Vercel Deployment (API Gateway Only)

```bash
cd api-gateway
npm install -g vercel
vercel

# Follow prompts
# Add environment variables in Vercel dashboard
```

Note: Vercel is best for the API Gateway. Use Railway/Render for Pipeline and Audio services.

## Option 3: GitHub Actions (Cron Jobs)

Create `.github/workflows/pipeline.yml`:

```yaml
name: Run Pipeline
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: npx ts-node src/main.ts
```

Create `.github/workflows/audio.yml`:

```yaml
name: Generate Audio
on:
  schedule:
    - cron: '10 * * * *'  # 10 min after pipeline
  workflow_dispatch:

jobs:
  audio:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd audio-service && npm install
      
      - name: Generate audio
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          YARNGPT_API_KEY: ${{ secrets.YARNGPT_API_KEY }}
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
          R2_DOMAIN: ${{ secrets.R2_DOMAIN }}
        run: cd audio-service && npx ts-node src/queue.ts
```

Add secrets in GitHub: Settings → Secrets and variables → Actions

## Production Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] Database schema created in Supabase
- [ ] R2 bucket created and configured
- [ ] API keys tested locally
- [ ] All services tested individually
- [ ] `.gitignore` includes `.env` files

### After Deployment

- [ ] Verify cron jobs are running
- [ ] Check logs for errors
- [ ] Test API endpoints
- [ ] Verify audio files are uploading to R2
- [ ] Monitor Supabase database growth
- [ ] Set up error notifications (optional)

### API Gateway Configuration

Update CORS in `api-gateway/src/server.ts`:

```typescript
app.use(cors({
  origin: "https://your-frontend-domain.com",  // Update this
  methods: ["GET"],
}));
```

### Monitoring

**Railway:**
- View logs in Railway dashboard
- Set up log drains for persistent logging

**GitHub Actions:**
- View workflow runs in Actions tab
- Enable email notifications for failures

**Supabase:**
- Monitor database size in dashboard
- Set up database backups

## Scaling Considerations

### Database
- Supabase free tier: 500MB database
- Upgrade to Pro if needed ($25/month)
- Consider archiving old broadcasts

### Storage
- R2 free tier: 10GB storage, 1M requests/month
- Very generous for this use case

### API
- Add caching for frequently accessed endpoints
- Use CDN for static assets
- Implement database connection pooling

### Costs Estimate

**Free Tier:**
- Supabase: Free (up to 500MB)
- Cloudflare R2: Free (up to 10GB)
- Railway: Free tier available
- GitHub Actions: 2000 min/month free

**Paid (if needed):**
- Supabase Pro: $25/month
- Railway: ~$5-20/month per service
- Cloudflare R2: Pay as you go (very cheap)

**Total estimated cost: $0-50/month** depending on usage

## Troubleshooting Deployment

### Railway Issues
- **Build fails**: Check Node version (use 18+)
- **Env vars not working**: Verify they're set in Railway dashboard
- **Cron not running**: Check cron expression syntax

### Vercel Issues
- **Serverless timeout**: API routes timeout after 10s on free tier
- **Cold starts**: First request may be slow

### GitHub Actions Issues
- **Secrets not working**: Check secret names match exactly
- **Workflow not triggering**: Verify cron syntax
- **Timeout**: Increase timeout in workflow file

## Support

For deployment help:
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- GitHub Actions: [docs.github.com/actions](https://docs.github.com/actions)
