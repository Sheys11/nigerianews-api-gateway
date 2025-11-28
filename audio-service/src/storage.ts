import * as dotenv from "dotenv";
dotenv.config();

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { validateEnv } from "./utils/env";

// Validate environment variables at startup
const env = validateEnv();

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
    },
});

export async function uploadAudioToR2(
    audioBuffer: Buffer,
    filename: string
): Promise<string> {
    console.log(`[STORAGE] Uploading ${filename} to R2...`);

    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: filename,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
    });

    await s3Client.send(command);

    const publicUrl = `https://${env.R2_DOMAIN}/${filename}`;
    console.log(`[STORAGE] Upload complete: ${publicUrl}`);

    return publicUrl;
}
