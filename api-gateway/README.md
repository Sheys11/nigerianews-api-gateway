# API Gateway

REST API for serving Nigerian News broadcasts to the frontend.

## Setup

1. Install dependencies:
```bash
cd api-gateway
npm install
```

2. Configure `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000
```

## Usage

Start the server:
```bash
npx ts-node src/server.ts
```

Or for development with auto-reload:
```bash
npm install -D nodemon
npx nodemon --exec ts-node src/server.ts
```

## Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-15T14:00:00Z"
}
```

### GET /broadcasts/latest
Get the most recent published broadcast.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "broadcast_hour": "2024-01-15T14:00:00Z",
    "full_script": "Good afternoon...",
    "audio": {
      "audio_url": "https://cdn.r2.cloudflarestorage.com/...",
      "duration_seconds": 110,
      "voice_used": "Idera"
    }
  }
}
```

### GET /broadcasts/:id
Get a specific broadcast by ID.

### GET /broadcasts
Get all published broadcasts (paginated).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

### GET /broadcasts/category/:category
Get broadcasts by category (not yet implemented).

## Features

- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: 100 requests per minute
- **Error Handling**: Comprehensive error responses
- **Pagination**: For list endpoints
