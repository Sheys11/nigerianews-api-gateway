/**
 * Environment Variable Validation Utility - Audio Service
 */

export interface EnvConfig {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    YARNGPT_API_KEY: string;
    YARNGPT_ENDPOINT: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY: string;
    R2_SECRET_KEY: string;
    R2_BUCKET_NAME: string;
    R2_DOMAIN: string;
}

export function validateEnv(): EnvConfig {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_KEY',
        'YARNGPT_API_KEY',
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY',
        'R2_SECRET_KEY',
        'R2_BUCKET_NAME',
        'R2_DOMAIN',
    ];
    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n  - ${missing.join('\n  - ')}\n\n` +
            `Please check your .env file and ensure all required variables are set.`
        );
    }

    return {
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_KEY: process.env.SUPABASE_KEY!,
        YARNGPT_API_KEY: process.env.YARNGPT_API_KEY!,
        YARNGPT_ENDPOINT: process.env.YARNGPT_ENDPOINT || 'https://api.yarngpt.com/v1/tts',
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
        R2_ACCESS_KEY: process.env.R2_ACCESS_KEY!,
        R2_SECRET_KEY: process.env.R2_SECRET_KEY!,
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
        R2_DOMAIN: process.env.R2_DOMAIN!,
    };
}
