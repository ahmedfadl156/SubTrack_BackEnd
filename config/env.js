import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = path.join(
    __dirname,
    `.env.${process.env.NODE_ENV || "development"}.local`
);

config({ path: envFile });

export const { PORT,
    NODE_ENV,
    DB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    ARCJET_ENV,
    ARCJET_KEY,
    QSTASH_URL,
    QSTASH_TOKEN,
    SERVER_URL,
    CLIENT_URL,
    EMAIL_PASSWORD,
    JWT_COOKIES_EXPIRES_IN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    SESSION_SECRET,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
    GEMINI_API_KEY
} = process.env;