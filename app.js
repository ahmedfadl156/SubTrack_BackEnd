import express from "express";
import { PORT, SESSION_SECRET, SERVER_URL, NODE_ENV } from "./config/env.js";
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
import { startCronJobs } from "./utils/cronJobs.js";
import paymentRouter from "./routes/payments.routes.js";
// The app
const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://subscription-tracker-frontend.vercel.app",
    ...(SERVER_URL ? [SERVER_URL] : []),
]

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}))

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: NODE_ENV === "production", httpOnly: true }
}))

app.use(passport.initialize())
app.use(passport.session())

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(arcjectMiddleware)

// Routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/subscriptions', subscriptionRouter)
app.use('/api/v1/payments', paymentRouter)
app.use('/api/v1/workflows', workflowRouter)

startCronJobs();

// Global Middleware
app.use(errorMiddleware)


// Start the server only after a successful database connection.
const startServer = async () => {
    await connectToDB();
    app.listen(PORT, () => {
        console.log(`The Server Is Running On Port ${PORT}`);
    });
};

// For local development
if (process.env.NODE_ENV !== "production") {
    startServer();
}

// Export app for serverless environments (Vercel)
export default app;
