import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/app.ts",
        "src/types/**",
        "src/test/**",
        "src/typings/**",
        "src/services/mongo-socket-io-server/**",
        "src/routes/static.ts",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
      },
      reporter: ["text", "html", "lcov"],
    },
    setupFiles: ["./src/test/setup.ts"],
  },
});
