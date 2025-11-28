#!/usr/bin/env ts-node
/**
 * Dashboard Server with Live Data
 * Serves the dashboard with real-time data from Supabase
 */

import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";

const app = express();
const PORT = process.env.DASHBOARD_PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static dashboard
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../dashboard.html"));
});

// API endpoint for dashboard data
app.get("/api/dashboard", async (req, res) => {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            return res.status(500).json({ error: "Missing Supabase credentials" });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );

        // Fetch all stats in parallel
        const [
            { count: totalTweets },
            { count: processedTweets },
            { count: totalBroadcasts },
            { count: publishedBroadcasts },
            { count: audioFiles },
            { count: recentTweets },
            { data: broadcasts },
            { data: categories },
        ] = await Promise.all([
            supabase.from("tweets").select("*", { count: "exact", head: true }),
            supabase
                .from("tweets")
                .select("*", { count: "exact", head: true })
                .eq("processed", true),
            supabase.from("broadcasts").select("*", { count: "exact", head: true }),
            supabase
                .from("broadcasts")
                .select("*", { count: "exact", head: true })
                .eq("is_published", true),
            supabase.from("audio").select("*", { count: "exact", head: true }),
            supabase
                .from("tweets")
                .select("*", { count: "exact", head: true })
                .gte("ingested_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
            supabase
                .from("broadcasts")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10),
            supabase.from("tweet_quality").select("primary_category, is_valid"),
        ]);

        // Calculate category distribution
        const categoryDist: Record<string, number> = {};
        if (categories) {
            categories.forEach((item) => {
                if (item.is_valid) {
                    categoryDist[item.primary_category] =
                        (categoryDist[item.primary_category] || 0) + 1;
                }
            });
        }

        // Check service health
        const { error: dbError } = await supabase
            .from("categories")
            .select("count")
            .limit(1);

        res.json({
            stats: {
                totalTweets: totalTweets || 0,
                processedTweets: processedTweets || 0,
                totalBroadcasts: totalBroadcasts || 0,
                publishedBroadcasts: publishedBroadcasts || 0,
                audioFiles: audioFiles || 0,
                recentTweets: recentTweets || 0,
            },
            categories: categoryDist,
            broadcasts: broadcasts || [],
            services: {
                database: !dbError,
                apiGateway: true, // If this endpoint responds, API is working
                scraper: true, // Would need to check scraper API
                gemini: !!process.env.GEMINI_API_KEY,
                r2: !!(
                    process.env.R2_ACCOUNT_ID &&
                    process.env.R2_ACCESS_KEY &&
                    process.env.R2_SECRET_KEY
                ),
            },
        });
    } catch (error) {
        console.error("Dashboard API error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`📊 Dashboard Server Running`);
    console.log(`========================================`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/dashboard`);
    console.log(`========================================\n`);
});
