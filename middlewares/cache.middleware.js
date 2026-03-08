import { redis } from "../config/redis.js";

export const cacheMiddleware = (keyPrefix, expirationInSeconds = 300) => {
    return async (req, res, next) => {
        const cacheKey = `${keyPrefix}:${req.user._id}`;

        try {
            // 1. بندور في Redis الأول
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                console.log(`Serving from Cache: ${cacheKey}`);
                return res.status(200).json(cachedData);
            }

            console.log(`Cache Miss, Fetching from DB: ${cacheKey}`);

            const originalJson = res.json.bind(res);

            res.json = (body) => {
                res.json = originalJson;

                if (body && body.status === "success") {
                    redis.set(cacheKey, body, { ex: expirationInSeconds })
                        .catch((err) => console.error("Redis Save Error in Background:", err));
                } else if (body && body.status === "error") {
                    console.log(`Skipping cache for error response: ${cacheKey}`);
                }

                // إرسال الرد الأصلي لـ Postman
                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error("Redis Connection Error:", error);
            // لو Redis فاصل أصلاً، تجاهله وكمل شغل من MongoDB عادي
            next();
        }
    };
};