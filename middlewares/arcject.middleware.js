import { isSpoofedBot } from "@arcjet/inspect";
import { aj } from "../config/arcject.js";

const arcjectMiddleware = async (req, res, next) => {
    try {
        // Set a timeout for Arcjet protection
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Arcjet timeout')), 5000)
        );

        const decision = await Promise.race([
            aj.protect(req, { requested: 1 }),
            timeoutPromise
        ]);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ error: "Too Many Requests Please Try Again Later!" });
            } else if (decision.reason.isBot()) {
                return res.status(403).json({ error: "No bots allowed" });
            } else {
                return res.status(403).json({ error: "Forbidden" });
            }
        } else if (decision.results.some(isSpoofedBot)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return next();
    } catch (error) {
        console.log(`[ARCJET] Middleware Error: ${error.message}`);
        // Don't block requests if Arcjet fails
        return next();
    }
}

export default arcjectMiddleware;
