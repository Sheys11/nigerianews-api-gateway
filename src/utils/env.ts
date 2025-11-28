/**
 * Environment Variable Validation Utility
 * Validates required environment variables at startup
 */

export interface EnvConfig {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    GEMINI_API_KEY: string;
    SCRAPER_API_URL?: string;
}

export function validateEnv(): EnvConfig {
    const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY'];
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
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
        SCRAPER_API_URL: process.env.SCRAPER_API_URL,
    };
}
