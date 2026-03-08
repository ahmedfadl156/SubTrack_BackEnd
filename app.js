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
import cors from "cors"
import { startCronJobs, startUpcomingRenewalsCronJob } from "./utils/cronJobs.js";
import paymentRouter from "./routes/payments.routes.js";
import notificationRouter from "./routes/notification.routes.js";

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

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// Then body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())

// Session middleware (in-memory store)
app.use(session({
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

// Global Error Middleware
app.use(errorMiddleware)


const startServer = async () => {
    try {
        await connectToDB();
        console.log('[SERVER] Database connected successfully');

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[SERVER] The Server Is Running On Port ${PORT}`);
        });

        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        server.requestTimeout = 30000;

        server.on('clientError', (err, socket) => {
            console.error('[SERVER ERROR]', err);
            if (socket.writable) {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            }
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`[SERVER] Port ${PORT} is already in use`);
            } else {
                console.error('[SERVER]', err);
            }
        });

        const gracefulShutdown = async () => {
            console.log('[SERVER] Shutting down gracefully...');
            server.close(async () => {
                console.log('[SERVER] HTTP server closed');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('[SERVER] Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        process.on('uncaughtException', (err) => {
            console.error('[UNCAUGHT EXCEPTION]', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason) => {
            console.error('[UNHANDLED REJECTION]', reason);
        });

    } catch (error) {
        console.error('[SERVER] Failed to start server:', error);
        process.exit(1);
    }
};

if (!process.env.VERCEL) {
    startServer();
}

export default app;