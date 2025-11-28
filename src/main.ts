import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export interface Tweet {
  tweet_id: string;
  author: string;
  author_verified: boolean;
  content: string;
  timestamp: string;
  retweet_count: number;
}

export interface QualityScore {
  is_valid: boolean;
  confidence_score: number;
  primary_category: string;
  secondary_categories: string[];
  rejection_reason?: string;
}

export interface Cluster {
  topic_name: string;
  primary_category: string;
  tweet_ids: string[];
  summary: string;
  source_accounts: string[];
}

// ============================================================================
// STAGE 1: FILTERING & QUALITY SCORING
// ============================================================================

export async function scoreAndFilterTweets(
  broadcastHour: Date
): Promise<Tweet[]> {
  console.log(`[FILTER] Starting quality scoring for ${broadcastHour}`);

  // Fetch tweets from last hour
  const oneHourAgo = new Date(broadcastHour.getTime() - 60 * 60 * 1000);

  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("*")
    .gte("ingested_at", oneHourAgo.toISOString())
    .lt("ingested_at", broadcastHour.toISOString())
    .eq("processed", false);

  if (error) throw error;
  if (!tweets || tweets.length === 0) {
    console.log("[FILTER] No tweets found for this hour");
    return [];
  }

  console.log(`[FILTER] Found ${tweets.length} tweets to score`);

  const validTweets: Tweet[] = [];

  for (const tweet of tweets) {
    const score = await scoreTweet(tweet);

    // Save quality score
    await supabase.from("tweet_quality").insert({
      tweet_id: tweet.tweet_id,
      is_valid: score.is_valid,
      confidence_score: score.confidence_score,
      primary_category: score.primary_category,
      secondary_categories: score.secondary_categories,
      rejection_reason: score.rejection_reason,
    });

    if (score.is_valid) {
      validTweets.push(tweet);
    }
  }

  console.log(
    `[FILTER] Quality scoring complete: ${validTweets.length}/${tweets.length} valid`
  );
  return validTweets;
}

export async function scoreTweet(tweet: Tweet, categoryThresholdOverride?: number): Promise<QualityScore> {
  const reasons: string[] = [];
  let score = 1.0;

  // Rule 1: Minimum length
  const cleanContent = tweet.content.replace(/[#@]/g, "").trim();
  if (cleanContent.length < 15) {
    return {
      is_valid: false,
      confidence_score: 0,
      primary_category: "Unknown",
      secondary_categories: [],
      rejection_reason: "Too short",
    };
  }

  // Rule 2: Emoji/hashtag ratio
  const emojiCount = (tweet.content.match(/[\u{1F300}-\u{1F9FF}]/gu) || [])
    .length;
  const hashtagCount = (tweet.content.match(/#/g) || []).length;

  if (emojiCount > 5) {
    reasons.push("Too many emojis");
    score -= 0.3;
  }

  if (hashtagCount > 5) {
    reasons.push("Too many hashtags");
    score -= 0.2;
  }

  // Rule 3: Engagement signal
  if (tweet.retweet_count === 0 && !tweet.author_verified) {
    score -= 0.2;
  } else if (tweet.retweet_count > 100) {
    score += 0.2;
  }

  // Rule 4: Author verification bonus
  if (tweet.author_verified) {
    score += 0.3;
  }

  // Rule 5: Categorize
  const { primary, secondaries } = categorizeTweet(tweet.content);

  // Rule 6: Check trust level
  let categoryThreshold: number;

  if (categoryThresholdOverride !== undefined) {
    categoryThreshold = categoryThresholdOverride;
  } else {
    const { data: category } = await supabase
      .from("categories")
      .select("min_sources, confidence_threshold")
      .eq("name", primary)
      .single();
    categoryThreshold = category?.confidence_threshold || 0.6;
  }

  const is_valid =
    score >= categoryThreshold &&
    emojiCount <= 5 &&
    hashtagCount <= 5 &&
    reasons.length === 0;

  return {
    is_valid,
    confidence_score: Math.max(0, Math.min(1, score)),
    primary_category: primary,
    secondary_categories: secondaries,
    rejection_reason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}

export function categorizeTweet(
  content: string
): { primary: string; secondaries: string[] } {
  const keywords: Record<string, string[]> = {
    Politics: ["election", "government", "president", "parliament", "minister"],
    Security: ["security", "attack", "military", "terrorism", "defense"],
    Health: ["health", "disease", "hospital", "vaccine", "covid", "doctor"],
    Economy: ["economy", "business", "market", "trade", "naira", "gdp"],
    Education: ["school", "education", "university", "student", "learning"],
    Energy: ["energy", "power", "oil", "electricity", "gas", "fuel"],
    Technology: ["tech", "startup", "ai", "software", "digital", "app"],
    Social: ["community", "society", "social", "culture", "life", "family"],
  };

  const contentLower = content.toLowerCase();
  const matches: Record<string, number> = {};

  for (const [category, words] of Object.entries(keywords)) {
    matches[category] = words.filter((w) =>
      contentLower.includes(w)
    ).length;
  }

  const sorted = Object.entries(matches).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0] || "Social";
  const secondaries = sorted
    .slice(1, 3)
    .filter(([_, count]) => count > 0)
    .map(([cat]) => cat);

  return { primary, secondaries };
}

// ============================================================================
// STAGE 2: CLUSTERING
// ============================================================================

export async function clusterTweets(
  tweets: Tweet[],
  getCategoryOverride?: (tweetId: string) => Promise<string>
): Promise<Cluster[]> {
  console.log(`[CLUSTER] Starting clustering for ${tweets.length} tweets`);

  if (tweets.length < 3) {
    console.log("[CLUSTER] Too few tweets, creating single cluster");
    return [
      {
        topic_name: "General News",
        primary_category: "Social",
        tweet_ids: tweets.map((t) => t.tweet_id),
        summary: "Mixed news updates",
        source_accounts: [...new Set(tweets.map((t) => t.author))],
      },
    ];
  }

  // Simple clustering: Group by primary category, then by semantic similarity
  const clusters: Record<string, Tweet[]> = {};

  for (const tweet of tweets) {
    let category = "Social";

    if (getCategoryOverride) {
      category = await getCategoryOverride(tweet.tweet_id);
    } else {
      const { data: quality } = await supabase
        .from("tweet_quality")
        .select("primary_category")
        .eq("tweet_id", tweet.tweet_id)
        .single();
      category = quality?.primary_category || "Social";
    }

    if (!clusters[category]) {
      clusters[category] = [];
    }
    clusters[category].push(tweet);
  }

  // Convert to Cluster objects
  const result: Cluster[] = Object.entries(clusters).map(([category, items]) => ({
    topic_name: category,
    primary_category: category,
    tweet_ids: items.map((t) => t.tweet_id),
    summary: `${items.length} updates in ${category}`,
    source_accounts: [...new Set(items.map((t) => t.author))],
  }));

  console.log(`[CLUSTER] Created ${result.length} clusters`);
  return result;
}

// ============================================================================
// STAGE 3: SUMMARIZATION (Using OpenAI or similar)
// ============================================================================

export async function summarizeCluster(
  cluster: Cluster,
  summarizerOverride?: (cluster: Cluster) => Promise<string>
): Promise<string> {
  if (summarizerOverride) {
    return summarizerOverride(cluster);
  }

  // Fetch full tweet content
  const { data: tweetData } = await supabase
    .from("tweets")
    .select("content")
    .in("tweet_id", cluster.tweet_ids);

  const tweets = tweetData || [];
  const combinedContent = tweets.map((t) => t.content).join("\n");

  // Call Gemini to summarize
  const prompt = `
You are a Nigerian news summarizer. Summarize these tweets about ${cluster.primary_category} into 1-2 clear, factual sentences suitable for a news broadcast.

Tweets:
${combinedContent}

Rules:
- Be objective and factual
- Include key details (what, who, where, when)
- Avoid speculation
- Maximum 2 sentences
- Include sources if mentioned

Summary:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.5,
        },
      }),
    }
  );

  const result = (await response.json()) as any;
  const summary =
    result.candidates?.[0]?.content?.parts?.[0]?.text || cluster.summary;

  return summary;
}

// ============================================================================
// STAGE 4: SCRIPT GENERATION
// ============================================================================

export async function generateBroadcastScript(
  clusters: Cluster[],
  broadcastHour: Date,
  summarizerOverride?: (cluster: Cluster) => Promise<string>
): Promise<string> {
  console.log("[SCRIPT] Generating broadcast script");

  // Get summaries for each cluster
  const sections: string[] = [];

  for (const cluster of clusters.slice(0, 5)) {
    // Limit to 5 top clusters
    const summary = await summarizeCluster(cluster, summarizerOverride);
    sections.push(summary);
  }

  // Format into script
  const timestamp = new Date(broadcastHour).toLocaleString("en-NG");
  const script = `
Good afternoon. This is the Nigerian News Brief for ${timestamp}.

${sections.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}

For more updates, visit our website or follow us on social media.

This has been the Nigerian News Brief. Thank you for listening.
`.trim();

  const wordCount = script.split(" ").length;
  console.log(`[SCRIPT] Generated script (${wordCount} words)`);

  return script;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function runPipeline(broadcastHour: Date = new Date()): Promise<void> {
  const executionId = `pipeline-${Date.now()}`;

  try {
    console.log(`\n========== PIPELINE EXECUTION ${executionId} ==========\n`);

    // Stage 1: Filter & Score
    const validTweets = await scoreAndFilterTweets(broadcastHour);

    if (validTweets.length === 0) {
      console.log("[ERROR] No valid tweets after filtering");
      return;
    }

    // Stage 2: Cluster
    const clusters = await clusterTweets(validTweets);

    // Stage 3: Summarize (already done in generateScript)

    // Stage 4: Generate Script
    const script = await generateBroadcastScript(clusters, broadcastHour);

    // Stage 5: Save Broadcast
    const { data: broadcast, error } = await supabase
      .from("broadcasts")
      .insert({
        broadcast_hour: broadcastHour.toISOString(),
        full_script: script,
        summary_text: script.split("\n")[2], // First news item
        cluster_count: clusters.length,
        total_tweets_used: validTweets.length,
        script_word_count: script.split(" ").length,
        estimated_audio_duration_seconds: Math.ceil(
          (script.split(" ").length / 150) * 60
        ), // ~150 words per minute
        is_published: false,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[SUCCESS] Broadcast created with ID ${broadcast?.id}`);
    console.log(`\n========== END EXECUTION ==========\n`);

    // Trigger audio generation (Phase 3)
    console.log("[INFO] Ready for audio generation (Phase 3)");
  } catch (err) {
    console.error("[FATAL]", err);
  }
}

// Run periodically (cron job)
// For development: run immediately
if (require.main === module) {
  runPipeline();
}

// For production: run every hour
// setInterval(() => runPipeline(new Date()), 60 * 60 * 1000);