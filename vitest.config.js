import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/__tests__/**/*.test.{js,jsx}", "server/__tests__/**/*.test.{js,jsx}"],
  },
});
