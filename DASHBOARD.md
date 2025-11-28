# Visualization Dashboard

Beautiful, real-time monitoring dashboard for the Nigerian News Pipeline.

## Quick Start

### Option 1: With Live Data (Recommended)

```bash
npm run dashboard
```

Then open: **http://localhost:4000**

This serves the dashboard with real-time data from your Supabase database.

### Option 2: Standalone (Static)

Simply open `dashboard.html` in your browser. You'll need to configure the API endpoint in the file.

## Features

### 📊 Real-Time Metrics
- Total tweets ingested
- Processed vs unprocessed tweets
- Total broadcasts created
- Published broadcasts
- Audio files generated
- Recent activity (last hour)

### 🔧 Service Health Monitoring
- Database (Supabase) connectivity
- API Gateway status
- Scraper API availability
- Gemini API status
- R2 Storage configuration

### 📂 Category Distribution
- Visual bar chart showing tweet distribution across categories
- Politics, Economy, Security, Technology, Education, Health, Energy, Social
- Real-time updates

### 📻 Recent Broadcasts
- Last 10 broadcasts with timestamps
- Publication status
- Tweet count and word count
- Visual status indicators

### ✨ Auto-Refresh
- Automatically refreshes every 30 seconds
- Manual refresh button available
- Last updated timestamp

## Screenshots

The dashboard features:
- **Dark theme** with gradient accents
- **Animated cards** with hover effects
- **Status indicators** with pulsing animations
- **Interactive bar charts** with smooth transitions
- **Responsive design** for mobile and desktop

## Configuration

### For Live Data Server

The dashboard server reads from your `.env` file automatically. No additional configuration needed!

### For Standalone Dashboard

Edit `dashboard.html` and update these constants:

```javascript
const API_BASE = 'http://localhost:3000';  // Your API Gateway URL
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY';
```

## Usage

### Local Development

```bash
# Terminal 1: Start API Gateway
cd api-gateway && npx ts-node src/server.ts

# Terminal 2: Start Dashboard
npm run dashboard

# Open browser
open http://localhost:4000
```

### Production Deployment

#### Deploy Dashboard to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

The dashboard is a static HTML file, so it can be deployed anywhere:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages
- Any static hosting

#### Configure for Production

Update the `API_BASE` constant in `dashboard.html` to point to your production API Gateway URL.

## Customization

### Change Refresh Interval

In `dashboard.html`, find this line:

```javascript
setInterval(loadDashboard, 30000);  // 30 seconds
```

Change `30000` to your desired interval in milliseconds.

### Add New Metrics

1. Update the dashboard server (`scripts/serve-dashboard.ts`) to fetch new data
2. Add new cards or charts in `dashboard.html`
3. Style with the existing CSS classes

### Change Color Theme

Edit the CSS variables in `dashboard.html`:

```css
/* Current: Blue/Purple gradient */
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);

/* Example: Green theme */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

## Troubleshooting

### Dashboard Shows "Failed to load data"

**Check:**
1. Is the API Gateway running? `cd api-gateway && npx ts-node src/server.ts`
2. Is the dashboard server running? `npm run dashboard`
3. Are CORS settings correct in API Gateway?

**Fix:**
```bash
# Restart API Gateway
cd api-gateway
npx ts-node src/server.ts

# Restart Dashboard
npm run dashboard
```

### No Data Showing

**Check:**
1. Is Supabase configured? Check `.env` file
2. Is there data in the database? Run `npm run status`
3. Check browser console for errors (F12)

### Services Showing as Failed

The dashboard checks:
- Database connectivity
- Environment variables
- API availability

Run `npm run health` to diagnose issues.

## API Endpoints

The dashboard server provides:

### GET /
Serves the dashboard HTML

### GET /api/dashboard
Returns JSON with all dashboard data:

```json
{
  "stats": {
    "totalTweets": 1250,
    "processedTweets": 1100,
    "totalBroadcasts": 42,
    "publishedBroadcasts": 38,
    "audioFiles": 38,
    "recentTweets": 85
  },
  "categories": {
    "Politics": 320,
    "Economy": 280,
    ...
  },
  "broadcasts": [...],
  "services": {
    "database": true,
    "apiGateway": true,
    ...
  }
}
```

## Mobile Support

The dashboard is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires modern browser with ES6+ support.

## Performance

- Initial load: <1 second
- Refresh: <500ms
- Auto-refresh: Every 30 seconds
- Minimal CPU usage
- Lightweight (~50KB total)

## Next Steps

1. Start the dashboard: `npm run dashboard`
2. Open http://localhost:4000
3. Watch your pipeline in real-time!
4. Deploy to production for 24/7 monitoring

Enjoy your beautiful monitoring dashboard! 🎨📊
