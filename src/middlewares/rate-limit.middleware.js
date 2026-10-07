import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/api-error.js";

// Throwing keeps rate-limit rejections in the same JSON shape as every other
// error, instead of express-rate-limit's own plain-text body.
const handler = (req, res, next, options) => {
  throw new ApiError(429, options.message);
};

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  // Tests drive hundreds of requests from one address; limiting them would
  // make the suite fail for reasons that have nothing to do with the code.
  skip: () => process.env.NODE_ENV === "test",
};

/** Broad ceiling so one client cannot saturate the API. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: "Too many requests. Please try again later.",
});

/**
 * Much tighter, because these endpoints are what credential stuffing and
 * password-reset spam actually target.
 */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  // Reading your own profile shouldn't spend the login budget.
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});
