import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/",
      "src/tests/e2e/**",
      "**/*.config.*"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
        "src/app/layout.tsx",
        "src/app/page.tsx",
      ],
      all: true,
      lines: 60,
      functions: 60,
      branches: 50,
      statements: 60
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ["default"],
    watch: false,
    passWithNoTests: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "test")
  }
})
