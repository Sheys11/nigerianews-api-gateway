/**
 * Scraper API Integration
 * Fetches tweets from the Nigerian news scraper service
 */

import { fetchWithTimeout } from "./retry";

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "https://nigerian-news-scraper-production.up.railway.app";

export interface ScraperTweet {
    tweet_id: string;
    author: string;
    author_verified: boolean;
    content: string;
    timestamp: string;
    retweet_count: number;
    likes?: number;
    replies?: number;
    url?: string;
}

export interface ScraperResponse {
    success: boolean;
    data?: ScraperTweet[];
    tweets?: ScraperTweet[];
    count?: number;
    error?: string;
    message?: string;
}

/**
 * Fetch latest tweets from the scraper API
 */
export async function fetchTweetsFromScraper(
    limit: number = 100,
    timeRange?: { start: Date; end: Date }
): Promise<ScraperTweet[]> {
    console.log(`[SCRAPER] Fetching tweets from ${SCRAPER_API_URL}`);

    try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("limit", limit.toString());

        if (timeRange) {
            params.append("start", timeRange.start.toISOString());
            params.append("end", timeRange.end.toISOString());
        }

        const url = `${SCRAPER_API_URL}/api/tweets?${params.toString()}`;

        const response = await fetchWithTimeout(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        }, 30000);

        if (!response.ok) {
            throw new Error(`Scraper API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as ScraperResponse;

        if (!result.success) {
            throw new Error(`Scraper API failed: ${result.error || result.message || "Unknown error"}`);
        }

        // Handle different response formats
        const tweets = result.data || result.tweets || [];

        console.log(`[SCRAPER] Fetched ${tweets.length} tweets`);
        return tweets;
    } catch (error) {
        console.error("[SCRAPER] Failed to fetch tweets:", (error as Error).message);

        // Return empty array on error - pipeline will continue with existing database tweets
        return [];
    }
}

/**
 * Fetch tweets and store them in the database
 */
export async function ingestTweetsFromScraper(
    supabase: any,
    limit: number = 100
): Promise<number> {
    console.log("[SCRAPER] Starting tweet ingestion");

    const tweets = await fetchTweetsFromScraper(limit);

    if (tweets.length === 0) {
        console.log("[SCRAPER] No tweets to ingest");
        return 0;
    }

    let insertedCount = 0;

    for (const tweet of tweets) {
        try {
            // Check if tweet already exists
            const { data: existing } = await supabase
                .from("tweets")
                .select("tweet_id")
                .eq("tweet_id", tweet.tweet_id)
                .single();

            if (existing) {
                continue; // Skip duplicate
            }

            // Insert new tweet
            const { error } = await supabase.from("tweets").insert({
                tweet_id: tweet.tweet_id,
                author: tweet.author,
                author_verified: tweet.author_verified || false,
                content: tweet.content,
                timestamp: tweet.timestamp,
                retweet_count: tweet.retweet_count || 0,
                ingested_at: new Date().toISOString(),
                processed: false,
            });

            if (error) {
                console.error(`[SCRAPER] Failed to insert tweet ${tweet.tweet_id}:`, error.message);
            } else {
                insertedCount++;
            }
        } catch (err) {
            console.error(`[SCRAPER] Error processing tweet ${tweet.tweet_id}:`, (err as Error).message);
        }
    }

    console.log(`[SCRAPER] Ingested ${insertedCount}/${tweets.length} new tweets`);
    return insertedCount;
}
