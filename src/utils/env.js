/**
 * Validates configuration at boot.
 *
 * Every one of these is read somewhere at request time. Without this check a
 * missing JWT secret only surfaces when the first user tries to log in, and a
 * deploy that silently lost an env var looks healthy until someone uses it.
 */

const REQUIRED = ["MONGO_URI", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];

const RECOMMENDED = [
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_EXPIRY",
  "CLIENT_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
];

// Values shipped in .env.example and the in-memory dev script. Fine locally,
// never in production.
const PLACEHOLDERS = [
  "replace-with-a-long-random-string",
  "replace-with-a-different-long-random-string",
  "dev-access-secret-not-for-production",
  "dev-refresh-secret-not-for-production",
];

export const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}.\n` +
        `Copy .env.example to .env and fill them in.`,
    );
  }

  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
      "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different, " +
        "or a refresh token would be accepted as an access token.",
    );
  }

  if (isProduction) {
    const weak = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"].filter(
      (key) =>
        PLACEHOLDERS.includes(process.env[key]) || process.env[key].length < 32,
    );
    if (weak.length) {
      throw new Error(
        `${weak.join(", ")} still use a placeholder or are shorter than 32 ` +
          `characters. Generate real secrets before deploying, e.g.\n` +
          `  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
      );
    }

    if (!process.env.CORS_ORIGIN) {
      console.warn(
        "⚠  CORS_ORIGIN is not set; falling back to http://localhost:5173. " +
          "Set it to your deployed frontend origin, or serve the client from " +
          "this server so no cross-origin request is made at all.",
      );
    }
  }

  const absent = RECOMMENDED.filter((key) => !process.env[key]?.trim());
  if (absent.length) {
    console.warn(
      `⚠  Not set: ${absent.join(", ")}. ` +
        `Token lifetimes fall back to library defaults and email will not send.`,
    );
  }
};
