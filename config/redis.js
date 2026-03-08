import { Redis } from "@upstash/redis";
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "./env.js";

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.error('[REDIS] Missing Redis configuration!');
    console.error('[REDIS] UPSTASH_REDIS_REST_URL:', UPSTASH_REDIS_REST_URL ? 'set' : 'NOT SET');
    console.error('[REDIS] UPSTASH_REDIS_REST_TOKEN:', UPSTASH_REDIS_REST_TOKEN ? 'set' : 'NOT SET');
}

export const redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
    automaticDeserialization: true
});

// Test Redis connection
redis.ping()
    .then(() => {
        console.log('[REDIS] Connected successfully');
    })
    .catch((err) => {
        console.error('[REDIS] Connection failed:', err.message);
    });