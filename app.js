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
import { RedisStore } from "connect-redis";
import cors from "cors"
import { startCronJobs, startUpcomingRenewalsCronJob } from "./utils/cronJobs.js";
import paymentRouter from "./routes/payments.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import { redis } from "./config/redis.js";
// The app
const app = express();

// CORS Configuration - Must be before routes
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://subscription-tracker-wheat.vercel.app",
            ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
        ];
        
        console.log(`[CORS] Request from origin: ${origin}`);
        
        if (!origin || allowedOrigins.includes(origin)) {
            console.log(`[CORS] Origin allowed: ${origin}`);
            callback(null, true);
        } else {
            console.error(`[CORS] Origin blocked: ${origin}`);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
    preflightContinue: false,
    maxAge: 86400
};

// CRITICAL: Apply CORS middleware VERY FIRST - before any other middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Then body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())

// Session middleware
app.use(session({
    store: new RedisStore({ client: redis }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: NODE_ENV === "production", 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax'
    }
}))

app.use(passport.initialize())
app.use(passport.session())

// Socket timeout middleware
app.use((req, res, next) => {
    req.socket.setTimeout(30000);
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
    try {
        await connectToDB();
        console.log('[SERVER] Database connected successfully');
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[SERVER] The Server Is Running On Port ${PORT}`);
        });

        // Server timeout configuration
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        server.requestTimeout = 30000;

        // Handle server errors
        server.on('clientError', (err, socket) => {
            console.error('[SERVER ERROR]', err);
            if (socket.writable) {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            }
        });

        // Handle connection errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`[SERVER] Port ${PORT} is already in use`);
            } else {
                console.error('[SERVER]', err);
            }
        });

        // Graceful shutdown
        const gracefulShutdown = async () => {
            console.log('[SERVER] Shutting down gracefully...');
            server.close(async () => {
                console.log('[SERVER] HTTP server closed');
                try {
                    // Close Redis connection
                    if (redis) {
                        await redis.disconnect();
                        console.log('[SERVER] Redis disconnected');
                    }
                } catch (err) {
                    console.error('[SERVER] Error during shutdown:', err);
                }
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('[SERVER] Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('[UNCAUGHT EXCEPTION]', err);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('[UNHANDLED REJECTION]', reason);
        });

    } catch (error) {
        console.error('[SERVER] Failed to start server:', error);
        process.exit(1);
    }
};

// Start server on Railway (and local dev). Skip only on Vercel (serverless).
if (!process.env.VERCEL) {
    startServer();
}

// Export app for serverless environments (Vercel)
export default app;
