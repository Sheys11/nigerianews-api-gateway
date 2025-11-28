#!/usr/bin/env ts-node
/**
 * Pipeline Status Monitor
 * Shows recent pipeline executions and their status
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

async function main() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY");
        process.exit(1);
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    console.log("\n========================================");
    console.log("   PIPELINE STATUS MONITOR");
    console.log("========================================\n");

    // Recent broadcasts
    const { data: broadcasts, error: broadcastError } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

    if (broadcastError) {
        console.error("❌ Failed to fetch broadcasts:", broadcastError.message);
        process.exit(1);
    }

    console.log("📻 Recent Broadcasts:");
    console.log("─".repeat(80));

    if (!broadcasts || broadcasts.length === 0) {
        console.log("   No broadcasts found\n");
    } else {
        for (const broadcast of broadcasts) {
            const status = broadcast.is_published ? "✅ Published" : "⏳ Pending";
            const date = new Date(broadcast.broadcast_hour).toLocaleString();
            console.log(`   ${status} | ${date}`);
            console.log(`   ID: ${broadcast.id} | Tweets: ${broadcast.total_tweets_used} | Clusters: ${broadcast.cluster_count}`);
            console.log(`   Words: ${broadcast.script_word_count} | Duration: ~${broadcast.estimated_audio_duration_seconds}s`);
            console.log();
        }
    }

    // Tweet stats
    const { count: totalTweets } = await supabase
        .from("tweets")
        .select("*", { count: "exact", head: true });

    const { count: processedTweets } = await supabase
        .from("tweets")
        .select("*", { count: "exact", head: true })
        .eq("processed", true);

    const { count: unprocessedTweets } = await supabase
        .from("tweets")
        .select("*", { count: "exact", head: true })
        .eq("processed", false);

    console.log("📊 Tweet Statistics:");
    console.log("─".repeat(80));
    console.log(`   Total tweets: ${totalTweets || 0}`);
    console.log(`   Processed: ${processedTweets || 0}`);
    console.log(`   Unprocessed: ${unprocessedTweets || 0}\n`);

    // Quality stats
    const { data: qualityStats } = await supabase
        .from("tweet_quality")
        .select("is_valid, primary_category");

    if (qualityStats && qualityStats.length > 0) {
        const valid = qualityStats.filter((q) => q.is_valid).length;
        const invalid = qualityStats.length - valid;
        const validPercent = ((valid / qualityStats.length) * 100).toFixed(1);

        console.log("✨ Quality Scores:");
        console.log("─".repeat(80));
        console.log(`   Valid: ${valid} (${validPercent}%)`);
        console.log(`   Invalid: ${invalid}\n`);

        // Category breakdown
        const categories: Record<string, number> = {};
        qualityStats.forEach((q) => {
            if (q.is_valid) {
                categories[q.primary_category] = (categories[q.primary_category] || 0) + 1;
            }
        });

        console.log("📂 Category Breakdown:");
        console.log("─".repeat(80));
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                console.log(`   ${cat}: ${count}`);
            });
        console.log();
    }

    // Audio status
    const { count: audioCount } = await supabase
        .from("audio")
        .select("*", { count: "exact", head: true });

    console.log("🎵 Audio Generation:");
    console.log("─".repeat(80));
    console.log(`   Total audio files: ${audioCount || 0}\n`);

    // Recent activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentTweets } = await supabase
        .from("tweets")
        .select("*", { count: "exact", head: true })
        .gte("ingested_at", oneHourAgo);

    console.log("⏰ Recent Activity (Last Hour):");
    console.log("─".repeat(80));
    console.log(`   New tweets ingested: ${recentTweets || 0}\n`);

    console.log("========================================\n");
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Status check failed:", err);
        process.exit(1);
    });
}
