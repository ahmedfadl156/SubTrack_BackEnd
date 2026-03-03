import arcjet , {shield , detectBot , tokenBucket} from "@arcjet/node";
import { ARCJET_KEY, NODE_ENV } from "./env.js";

const isProduction = NODE_ENV === "production";
const arcjetMode = isProduction ? "LIVE" : "DRY_RUN";

export const aj = arcjet({
    key: ARCJET_KEY,
    rules: [
    shield({ mode: arcjetMode }),
    // Create a bot detection rule
    detectBot({
        mode: arcjetMode,
        allow: [
        "CATEGORY:SEARCH_ENGINE", 
    ],
    }),
    tokenBucket({
        mode: arcjetMode,
        refillRate: 5, 
        interval: 10, 
        capacity: 10, 
    }),
],
});
