import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
  },
  server: {
    // The client always calls the API with relative URLs, so in development
    // the dev server forwards /api to the backend. That keeps dev and
    // production on identical code paths and means the browser never makes a
    // cross-origin request, so CORS is not involved locally either.
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
