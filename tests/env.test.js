import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../src/utils/env.js";

const withEnv = (overrides, run) => {
  const saved = { ...process.env };
  // Start from a clean slate so the ambient environment cannot mask a gap.
  for (const key of [
    "MONGO_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "NODE_ENV",
    "CORS_ORIGIN",
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, overrides);
  try {
    return run();
  } finally {
    process.env = saved;
  }
};

const valid = {
  MONGO_URI: "mongodb://127.0.0.1:27017/test",
  ACCESS_TOKEN_SECRET: "a".repeat(40),
  REFRESH_TOKEN_SECRET: "b".repeat(40),
};

test("passes when the required variables are present", () => {
  withEnv(valid, () => assert.doesNotThrow(validateEnv));
});

test("names every missing required variable", () => {
  withEnv({ MONGO_URI: "mongodb://127.0.0.1:27017/test" }, () => {
    assert.throws(validateEnv, (err) => {
      assert.match(err.message, /ACCESS_TOKEN_SECRET/);
      assert.match(err.message, /REFRESH_TOKEN_SECRET/);
      return true;
    });
  });
});

test("rejects identical access and refresh secrets", () => {
  withEnv({ ...valid, REFRESH_TOKEN_SECRET: valid.ACCESS_TOKEN_SECRET }, () => {
    assert.throws(validateEnv, /must be different/);
  });
});

test("rejects placeholder secrets in production", () => {
  withEnv(
    {
      ...valid,
      NODE_ENV: "production",
      CORS_ORIGIN: "https://example.com",
      ACCESS_TOKEN_SECRET: "replace-with-a-long-random-string",
    },
    () => {
      assert.throws(validateEnv, /placeholder/);
    },
  );
});

test("rejects short secrets in production but allows them in development", () => {
  withEnv(
    {
      ...valid,
      NODE_ENV: "production",
      CORS_ORIGIN: "https://example.com",
      ACCESS_TOKEN_SECRET: "tooshort",
    },
    () => assert.throws(validateEnv, /32/),
  );

  withEnv({ ...valid, ACCESS_TOKEN_SECRET: "tooshort" }, () =>
    assert.doesNotThrow(validateEnv),
  );
});
