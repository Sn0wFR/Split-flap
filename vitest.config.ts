import { defineConfig } from "vitest/config";
import { cssAsText } from "./scripts/vite-css-text.js";

export default defineConfig({
  plugins: [cssAsText()],
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
