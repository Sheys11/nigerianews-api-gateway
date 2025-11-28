import * as dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { validateEnv } from "./utils/env";

// Validate environment variables at startup
const env = validateEnv();

const app = express();
const PORT = env.PORT;

// Initialize Supabase
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

// Middleware
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  methods: ["GET"],
}));

app.use(express.json());

// Rate limiting: 100 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

// ============================================================================
// ENDPOINTS
// ============================================================================

// Health check with database connectivity
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    const { error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);

    const isHealthy = !error;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? "API is running" : "Database unhealthy",
      timestamp: new Date().toISOString(),
      database: isHealthy ? "connected" : "disconnected",
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: "Service unavailable",
      timestamp: new Date().toISOString(),
      database: "error",
      error: err.message,
    });
  }
});

// Get latest broadcast
app.get("/broadcasts/latest", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("broadcasts")
      .select(`
        *,
        audio (
          audio_url,
          duration_seconds,
          voice_used
        )
      `)
      .eq("is_published", true)
      .order("broadcast_hour", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "No broadcasts found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("[API] Error fetching latest broadcast:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

// Get broadcast by ID
app.get("/broadcasts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("broadcasts")
      .select(`
        *,
        audio (
          audio_url,
          duration_seconds,
          voice_used
        )
      `)
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Broadcast not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error(`[API] Error fetching broadcast ${req.params.id}:`, err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});



// Get all published broadcasts (paginated)
app.get("/broadcasts", async (req: Request, res: Response) => {
  try {
    // Validate and sanitize pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("broadcasts")
      .select(`
        *,
        audio (
          audio_url,
          duration_seconds,
          voice_used
        )
      `, { count: "exact" })
      .eq("is_published", true)
      .order("broadcast_hour", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("[API] Error fetching broadcasts:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[API] Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n========== API GATEWAY ==========`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`CORS origins: ${env.ALLOWED_ORIGINS.join(', ')}`);
  console.log(`=================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
});

export default app;
