/**
 * Runs the API against a throwaway in-memory MongoDB.
 *
 * For when you want to click around the app without installing MongoDB or
 * pointing MONGO_URI at Atlas. Data lives only as long as the process, so
 * this is for development only — never for anything you want to keep.
 *
 *   npm run dev:memdb
 */
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();

console.log(`\n⚠  In-memory MongoDB — all data is discarded on exit.`);
console.log(`   ${uri}\n`);

const child = spawn("npx", ["nodemon", "src/index.js"], {
  stdio: "inherit",
  env: {
    PORT: "8000",
    NODE_ENV: "development",
    CORS_ORIGIN: "http://localhost:5173",
    ACCESS_TOKEN_SECRET: "dev-access-secret-not-for-production",
    REFRESH_TOKEN_SECRET: "dev-refresh-secret-not-for-production",
    ACCESS_TOKEN_EXPIRY: "1d",
    REFRESH_TOKEN_EXPIRY: "10d",
    CLIENT_URL: "http://localhost:5173",
    ...process.env,
    MONGO_URI: uri,
  },
});

const shutdown = async () => {
  child.kill("SIGTERM");
  await mongo.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
child.on("exit", shutdown);
