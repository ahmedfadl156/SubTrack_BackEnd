const errorMiddleware = (err, req, res, next) => {
    try {
        let error = { ...err };
        error.message = err.message;
        console.error('[ERROR]:', err);

        // Mongoose bad ObjectId
        if (err.name === "CastError") {
            const message = `Resource Not Found`;
            error = new Error(message);
            error.statusCode = 404;
        }

        // Mongoose duplicate key
        if (err.code === 11000) {
            const message = `Duplicate field value entered`;
            error = new Error(message);
            error.statusCode = 400;
        }

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(val => val.message);
            error = new Error(message.join(', '));
            error.statusCode = 400;
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            const message = 'Invalid token';
            error = new Error(message);
            error.statusCode = 401;
        }

        if (err.name === 'TokenExpiredError') {
            const message = 'Token expired';
            error = new Error(message);
            error.statusCode = 401;
        }

        const statusCode = error.statusCode || 500;
        const errorMessage = error.message || "Something Went Wrong Please Try Again Later!";

        // Prevent sending error details in production
        const responseMessage = process.env.NODE_ENV === 'production' && statusCode === 500
            ? "Internal Server Error"
            : errorMessage;

        if (!res.headersSent) {
            res.status(statusCode).json({
                success: false,
                statusCode: statusCode,
                error: responseMessage,
                ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
            });
        }
    } catch (error) {
        console.error('[UNHANDLED ERROR]:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: "Internal Server Error"
            });
        }
    }
}

export default errorMiddleware;