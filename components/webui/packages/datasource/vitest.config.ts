import path from "node:path";

import {defineConfig} from "vitest/config";


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
