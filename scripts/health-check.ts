#!/usr/bin/env ts-node
/**
 * System Health Monitor
 * Checks the health of all services and reports status
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const SCRAPER_URL = process.env.SCRAPER_API_URL || "https://nigerian-news-scraper-production.up.railway.app";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";

interface HealthCheck {
    service: string;
    status: "✅ Healthy" | "⚠️ Warning" | "❌ Failed";
    message: string;
    details?: any;
}

async function checkDatabase(): Promise<HealthCheck> {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            return {
                service: "Database (Supabase)",
                status: "❌ Failed",
                message: "Missing SUPABASE_URL or SUPABASE_KEY",
            };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );

        // Check connection
        const { data: categories, error: catError } = await supabase
            .from("categories")
            .select("count");

        if (catError) {
            return {
                service: "Database (Supabase)",
                status: "❌ Failed",
                message: `Connection failed: ${catError.message}`,
            };
        }

        // Get stats
        const { count: tweetCount } = await supabase
            .from("tweets")
            .select("*", { count: "exact", head: true });

        const { count: broadcastCount } = await supabase
            .from("broadcasts")
            .select("*", { count: "exact", head: true });

        const { count: publishedCount } = await supabase
            .from("broadcasts")
            .select("*", { count: "exact", head: true })
            .eq("is_published", true);

        return {
            service: "Database (Supabase)",
            status: "✅ Healthy",
            message: "Connected successfully",
            details: {
                tweets: tweetCount || 0,
                broadcasts: broadcastCount || 0,
                published: publishedCount || 0,
            },
        };
    } catch (error) {
        return {
            service: "Database (Supabase)",
            status: "❌ Failed",
            message: (error as Error).message,
        };
    }
}

async function checkScraperAPI(): Promise<HealthCheck> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${SCRAPER_URL}/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            return {
                service: "Scraper API",
                status: "✅ Healthy",
                message: `Responding at ${SCRAPER_URL}`,
            };
        } else {
            return {
                service: "Scraper API",
                status: "⚠️ Warning",
                message: `HTTP ${response.status}: ${response.statusText}`,
            };
        }
    } catch (error) {
        return {
            service: "Scraper API",
            status: "❌ Failed",
            message: (error as Error).message.includes("abort")
                ? "Timeout after 10s"
                : (error as Error).message,
        };
    }
}

async function checkAPIGateway(): Promise<HealthCheck> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_GATEWAY_URL}/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            return {
                service: "API Gateway",
                status: "✅ Healthy",
                message: `Running at ${API_GATEWAY_URL}`,
                details: data,
            };
        } else {
            return {
                service: "API Gateway",
                status: "⚠️ Warning",
                message: `HTTP ${response.status}`,
            };
        }
    } catch (error) {
        return {
            service: "API Gateway",
            status: "❌ Failed",
            message: (error as Error).message.includes("abort")
                ? "Timeout after 5s"
                : "Not running or unreachable",
        };
    }
}

async function checkGeminiAPI(): Promise<HealthCheck> {
    if (!process.env.GEMINI_API_KEY) {
        return {
            service: "Gemini API",
            status: "❌ Failed",
            message: "Missing GEMINI_API_KEY",
        };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }],
                }),
                signal: controller.signal,
            }
        );
        clearTimeout(timeout);

        if (response.ok) {
            return {
                service: "Gemini API",
                status: "✅ Healthy",
                message: "API key valid",
            };
        } else {
            return {
                service: "Gemini API",
                status: "❌ Failed",
                message: `HTTP ${response.status}: Invalid API key or quota exceeded`,
            };
        }
    } catch (error) {
        return {
            service: "Gemini API",
            status: "⚠️ Warning",
            message: (error as Error).message,
        };
    }
}

async function checkR2Storage(): Promise<HealthCheck> {
    const required = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY",
        "R2_SECRET_KEY",
        "R2_BUCKET_NAME",
    ];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        return {
            service: "R2 Storage",
            status: "⚠️ Warning",
            message: `Missing: ${missing.join(", ")}`,
        };
    }

    return {
        service: "R2 Storage",
        status: "✅ Healthy",
        message: "Configuration present (upload test not performed)",
    };
}

async function main() {
    console.log("\n========================================");
    console.log("   NIGERIAN NEWS PIPELINE - HEALTH CHECK");
    console.log("========================================\n");

    const checks = await Promise.all([
        checkDatabase(),
        checkScraperAPI(),
        checkAPIGateway(),
        checkGeminiAPI(),
        checkR2Storage(),
    ]);

    // Print results
    for (const check of checks) {
        console.log(`${check.status} ${check.service}`);
        console.log(`   ${check.message}`);
        if (check.details) {
            console.log(`   Details:`, JSON.stringify(check.details, null, 2));
        }
        console.log();
    }

    // Summary
    const healthy = checks.filter((c) => c.status === "✅ Healthy").length;
    const warnings = checks.filter((c) => c.status === "⚠️ Warning").length;
    const failed = checks.filter((c) => c.status === "❌ Failed").length;

    console.log("========================================");
    console.log(`Summary: ${healthy} healthy, ${warnings} warnings, ${failed} failed`);
    console.log("========================================\n");

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Health check failed:", err);
        process.exit(1);
    });
}
