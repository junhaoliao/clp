import {defineConfig} from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@webui/common": path.resolve(__dirname, "../common/src"),
    },
  },
});
