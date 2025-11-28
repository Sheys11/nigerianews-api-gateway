import { scoreTweet, categorizeTweet, clusterTweets, generateBroadcastScript, Tweet, Cluster } from "./main";

async function runTests() {
    console.log("Running logic verification...");

    // Test 1: Categorization
    console.log("\nTest 1: Categorization");
    const catResult = categorizeTweet("The president announced a new policy on education.");
    console.log("Input: 'The president announced a new policy on education.'");
    console.log("Result:", catResult);
    if (catResult.primary === "Politics" && catResult.secondaries.includes("Education")) {
        console.log("✅ Categorization passed");
    } else {
        console.log("❌ Categorization failed");
    }

    // Test 2: Scoring - Short tweet
    console.log("\nTest 2: Scoring (Short tweet)");
    const shortTweet: Tweet = {
        tweet_id: "1",
        author: "user",
        author_verified: false,
        content: "Too short",
        timestamp: new Date().toISOString(),
        retweet_count: 0
    };
    const score1 = await scoreTweet(shortTweet, 0.5);
    console.log("Result:", score1);
    if (!score1.is_valid && score1.rejection_reason === "Too short") {
        console.log("✅ Short tweet rejection passed");
    } else {
        console.log("❌ Short tweet rejection failed");
    }

    // Test 3: Scoring - Good tweet
    console.log("\nTest 3: Scoring (Good tweet)");
    const goodTweet: Tweet = {
        tweet_id: "2",
        author: "verified_user",
        author_verified: true,
        content: "The central bank has updated the foreign exchange rates for the naira today. #Economy #Nigeria",
        timestamp: new Date().toISOString(),
        retweet_count: 150
    };

    const score2 = await scoreTweet(goodTweet, 0.5);
    console.log("Result:", score2);
    if (score2.is_valid) {
        console.log("✅ Good tweet acceptance passed");
    } else {
        console.log("❌ Good tweet acceptance failed");
    }

    // Test 4: Clustering
    console.log("\nTest 4: Clustering");
    const tweetsToCluster: Tweet[] = [
        { ...goodTweet, tweet_id: "t1", content: "Economy news 1" },
        { ...goodTweet, tweet_id: "t2", content: "Economy news 2" },
        { ...goodTweet, tweet_id: "t3", content: "Sports news 1" }, // Assuming we map this to Social or Sports if exists
    ];

    const mockGetCategory = async (id: string) => {
        if (id === "t1" || id === "t2") return "Economy";
        return "Social";
    };


    const clusters = await clusterTweets(tweetsToCluster, mockGetCategory);
    console.log("Clusters created:", clusters.length);
    if (clusters.length === 2) {
        console.log("✅ Clustering passed (created 2 clusters)");
        const economyCluster = clusters.find(c => c.primary_category === "Economy");
        if (economyCluster && economyCluster.tweet_ids.length === 2) {
            console.log("✅ Economy cluster has correct number of tweets");
        } else {
            console.log("❌ Economy cluster content mismatch");
        }
    } else {
        console.log("❌ Clustering failed (expected 2 clusters)");
    }

    // Test 5: Script Generation
    console.log("\nTest 5: Script Generation");

    const mockClusters: Cluster[] = [
        {
            topic_name: "Economy",
            primary_category: "Economy",
            tweet_ids: ["t1", "t2"],
            summary: "Raw summary",
            source_accounts: ["User1"]
        },
        {
            topic_name: "Politics",
            primary_category: "Politics",
            tweet_ids: ["t4"],
            summary: "Raw summary",
            source_accounts: ["User2"]
        }
    ];

    const mockSummarizer = async (cluster: Cluster) => {
        return `Summarized news about ${cluster.primary_category}.`;
    };

    const script = await generateBroadcastScript(mockClusters, new Date(), mockSummarizer);
    console.log("Generated Script:\n---\n" + script + "\n---");

    if (script.includes("Summarized news about Economy") && script.includes("Summarized news about Politics")) {
        console.log("✅ Script generation passed");
    } else {
        console.log("❌ Script generation failed");
    }
}

runTests();
