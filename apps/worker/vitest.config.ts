import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["src/e2e.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/**/*.test.ts",
        "src/**/__mocks__/**",
        "test/**",
      ],
    },
    globals: true,
    setupFiles: ["./test/setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@svg-api/shared/constants": path.resolve(
        __dirname,
        "../../packages/shared/src/constants.ts",
      ),
      "@svg-api/shared/types": path.resolve(
        __dirname,
        "../../packages/shared/src/types.ts",
      ),
      "@svg-api/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
});
