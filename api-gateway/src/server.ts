import * as dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Middleware
app.use(cors({
  origin: "*", // Update with your frontend domain in production
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

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
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

// Get broadcasts by category
app.get("/broadcasts/category/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // This would require a categories table or filtering logic
    // For now, returning a placeholder response
    res.status(501).json({
      success: false,
      error: "Category filtering not yet implemented",
      message: "This endpoint requires additional database schema setup",
    });
  } catch (err: any) {
    console.error(`[API] Error fetching category ${req.params.category}:`, err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

// Get all published broadcasts (paginated)
app.get("/broadcasts", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
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
app.listen(PORT, () => {
  console.log(`\n========== API GATEWAY ==========`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`=================================\n`);
});

export default app;
