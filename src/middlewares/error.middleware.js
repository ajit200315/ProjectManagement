import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";

/**
 * Converts anything thrown by a route into the ApiError JSON shape so
 * clients always get a consistent body instead of Express' default
 * HTML error page.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong";

    // Duplicate key on a unique index.
    if (error.code === 11000) {
      statusCode = 409;
      message = `A record with that ${Object.keys(error.keyValue ?? {}).join(", ")} already exists`;
    } else if (error instanceof mongoose.Error.ValidationError) {
      statusCode = 422;
      message = "Received data is not valid";
    } else if (error instanceof mongoose.Error.CastError) {
      statusCode = 400;
      message = `Invalid ${error.path}`;
    } else if (error.name === "BSONError") {
      // Hand-built ObjectIds throw this rather than a mongoose CastError.
      statusCode = 400;
      message = "Invalid id";
    }

    error = new ApiError(statusCode, message, error?.errors ?? [], error.stack);
  }

  // Keep the test output readable; negative tests throw on purpose.
  if (!["production", "test"].includes(process.env.NODE_ENV)) {
    console.error(error);
  }

  return res.status(error.statusCode).json({
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.error,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
};

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

export { errorHandler, notFound };
