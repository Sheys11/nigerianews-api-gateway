/**
 * Retry Utility with Exponential Backoff
 * Provides retry logic for API calls and other operations
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    timeoutMs: 30000,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === opts.maxRetries) {
                throw new Error(
                    `Failed after ${opts.maxRetries} retries: ${lastError.message}`
                );
            }

            const delay = Math.min(
                opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelayMs
            );

            console.warn(
                `[RETRY] Attempt ${attempt + 1}/${opts.maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Fetch with timeout and retry
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
