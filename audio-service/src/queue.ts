import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { generateAudioWithYarnGPT } from "./audio_generator";
import { uploadAudioToR2 } from "./storage";
import { validateEnv } from "./utils/env";

// Validate environment variables at startup
const env = validateEnv();

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export async function processAudioQueue(): Promise<void> {
    console.log("\n========== AUDIO QUEUE PROCESSOR ==========\n");

    try {
        // Fetch unpublished broadcasts
        const { data: broadcasts, error } = await supabase
            .from("broadcasts")
            .select("*")
            .eq("is_published", false)
            .order("broadcast_hour", { ascending: true })
            .limit(10);

        if (error) throw error;

        if (!broadcasts || broadcasts.length === 0) {
            console.log("[QUEUE] No unpublished broadcasts found");
            return;
        }

        console.log(`[QUEUE] Found ${broadcasts.length} broadcasts to process`);

        for (const broadcast of broadcasts) {
            console.log(`\n[QUEUE] Processing broadcast ID: ${broadcast.id}`);

            try {
                // Generate audio
                const audioBuffer = await generateAudioWithYarnGPT({
                    text: broadcast.full_script,
                    voice: "Idera",
                });

                // Upload to R2
                const filename = `broadcast-${broadcast.id}-${Date.now()}.mp3`;
                const audioUrl = await uploadAudioToR2(audioBuffer, filename);

                // Calculate duration (rough estimate: ~150 words per minute)
                const wordCount = broadcast.script_word_count || 0;
                const durationSeconds = Math.ceil((wordCount / 150) * 60);

                // Save audio metadata
                const { error: audioError } = await supabase.from("audio").insert({
                    broadcast_id: broadcast.id,
                    audio_url: audioUrl,
                    duration_seconds: durationSeconds,
                    file_size_bytes: audioBuffer.length,
                    voice_used: "Idera",
                });

                if (audioError) throw audioError;

                // Mark broadcast as published
                const { error: updateError } = await supabase
                    .from("broadcasts")
                    .update({ is_published: true })
                    .eq("id", broadcast.id);

                if (updateError) throw updateError;

                console.log(`[QUEUE] ✅ Broadcast ${broadcast.id} processed successfully`);
            } catch (err) {
                console.error(`[QUEUE] ❌ Error processing broadcast ${broadcast.id}:`, err);
                // Continue with next broadcast
            }
        }

        console.log("\n========== QUEUE PROCESSING COMPLETE ==========\n");
    } catch (err) {
        console.error("[QUEUE] Fatal error:", err);
        throw err;
    }
}

// Run if executed directly
if (require.main === module) {
    processAudioQueue().catch((err) => {
        console.error('[FATAL] Audio queue processing failed:', err);
        process.exit(1);
    });
}
