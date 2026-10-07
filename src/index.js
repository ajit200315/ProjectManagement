import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./db/index.js";
import { validateEnv } from "./utils/env.js";

dotenv.config({
  path: "./.env",
});

try {
  validateEnv();
} catch (error) {
  console.error(`\n❌ ${error.message}\n`);
  process.exit(1);
}

const port = process.env.PORT || 8000;

const server = await connectDB()
  .then(() =>
    app.listen(port, () => {
      console.log(`✅ Listening on http://localhost:${port}`);
    }),
  )
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });

/**
 * Hosting platforms send SIGTERM and then kill the process a short time
 * later. Closing in order means in-flight requests finish and Mongo is not
 * dropped mid-write.
 */
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down…`);

  const forced = setTimeout(() => {
    console.error("Did not close in time, forcing exit.");
    process.exit(1);
  }, 10_000);
  forced.unref();

  try {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    await mongoose.connection.close();
    console.log("Closed cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  shutdown("unhandledRejection");
});
