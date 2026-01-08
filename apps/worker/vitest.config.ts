import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/e2e.test.ts"],
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
