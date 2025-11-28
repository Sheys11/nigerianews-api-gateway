/**
 * Environment Variable Validation Utility - API Gateway
 */

export interface EnvConfig {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    PORT: number;
    ALLOWED_ORIGINS: string[];
}

export function validateEnv(): EnvConfig {
    const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
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
        PORT: parseInt(process.env.PORT || '3000', 10),
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    };
}
