import {defineConfig, mergeConfig} from "vitest/config";
import viteConfig from "./vite.config";


export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/main.tsx",
                "src/components/ui/**",
                "src/sql-parser/generated/**",
                "src/test/**",
                "src/vite-env.d.ts",
            ],
            thresholds: {
                lines: 90,
                branches: 90,
            },
        },
        setupFiles: ["./src/test/setup.ts"],
    },
}));
