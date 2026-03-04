import { isSpoofedBot } from "@arcjet/inspect";
import { aj } from "../config/arcject.js";

const arcjectMiddleware = async (req, res, next) => {
    try {
        const decision = await aj.protect(req, { requested: 1 });

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
        console.log(`Arcject Middleware Error: ${error}`)
        return next(error)
    }
}

export default arcjectMiddleware;
