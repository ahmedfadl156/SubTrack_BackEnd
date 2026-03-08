import express from "express";
import { PORT, SESSION_SECRET, NODE_ENV, CLIENT_URL } from "./config/env.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import connectToDB from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";
import arcjectMiddleware from "./middlewares/arcject.middleware.js";
import workflowRouter from "./routes/workflow.routes.js";
import passport from "passport";
import session from "express-session";
import {RedisStore} from "connect-redis";
import cors from "cors"
import { startCronJobs, startUpcomingRenewalsCronJob } from "./utils/cronJobs.js";
import paymentRouter from "./routes/payments.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import { redis } from "./config/redis.js";
// The app
const app = express();

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://subscription-tracker-wheat.vercel.app",
            ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(session({
    store: new RedisStore({ client: redis }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: NODE_ENV === "production", 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}))

app.use(passport.initialize())
app.use(passport.session())

// Middlewares
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())

// Timeout middleware - prevent hanging requests
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 second timeout
    res.setTimeout(30000);
    next();
});

app.use(arcjectMiddleware)

// Routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/subscriptions', subscriptionRouter)
app.use('/api/v1/payments', paymentRouter)
app.use('/api/v1/workflows', workflowRouter)
app.use('/api/v1/notifications', notificationRouter)

// Cron Jobs
startCronJobs();
startUpcomingRenewalsCronJob();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Middleware
app.use(errorMiddleware)


// Start the server only after a successful database connection.
const startServer = async () => {
    await connectToDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`The Server Is Running On Port ${PORT}`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Graceful shutdown
    const gracefulShutdown = async () => {
        console.log('Shutting down gracefully...');
        server.close(async () => {
            console.log('Server closed');
            try {
                await redis.disconnect();
                console.log('Redis disconnected');
            } catch (err) {
                console.error('Error disconnecting Redis:', err);
            }
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error('Forced shutdown');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
};

// Start server on Railway (and local dev). Skip only on Vercel (serverless).
if (!process.env.VERCEL) {
    startServer();
}

// Export app for serverless environments (Vercel)
export default app;
