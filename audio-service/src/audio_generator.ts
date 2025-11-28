import * as dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

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

    // YarnGPT TTS API endpoint (placeholder - update with actual endpoint)
    const response = await fetch("https://api.yarngpt.com/v1/tts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`,
        },
        body: JSON.stringify({
            text,
            voice,
            speed,
            format: "mp3",
        }),
    });

    if (!response.ok) {
        throw new Error(`YarnGPT API error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[AUDIO] Generated ${buffer.length} bytes of audio`);
    return buffer;
}
