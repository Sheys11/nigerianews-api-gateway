import * as dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./utils/env";

// Validate environment variables at startup
const env = validateEnv();

export interface AudioGenerationOptions {
    text: string;
    voice?: "Idera" | "Femi" | "Chinenye";
    speed?: number;
}

export async function generateAudioWithYarnGPT(
    options: AudioGenerationOptions
): Promise<Buffer> {
    const { text, voice = "Idera", speed = 1.0 } = options;

    console.log(`[AUDIO] Generating audio with voice: ${voice}`);

    // YarnGPT TTS API endpoint from environment
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await fetch(env.YARNGPT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.YARNGPT_API_KEY}`,
            },
            body: JSON.stringify({
                text,
                voice,
                speed,
                format: "mp3",
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`YarnGPT API error: ${response.status} - ${errorText}`);
        }

        // Validate content type
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('audio')) {
            console.warn(`[AUDIO] Expected audio response, got: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`[AUDIO] Generated ${buffer.length} bytes of audio`);
        return buffer;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new Error('YarnGPT API request timeout after 30 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
