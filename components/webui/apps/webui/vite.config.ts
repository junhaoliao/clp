import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";


export default defineConfig({
    base: "./",
    build: {
        target: "esnext",
        rollupOptions: {
            output: {
                /**
                 *
                 * @param id
                 */
                manualChunks (id) {
                    if (id.includes("monaco-editor")) {
                        return "monaco-editor";
                    }
                    if (id.includes("recharts")) {
                        return "recharts";
                    }

                    return undefined;
                },
            },
        },
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
    publicDir: "public",
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        dedupe: ["react",
            "react-dom",
            "react-is"],
    },
    server: {
        port: 8080,
        proxy: {
            "/api/": {
                target: "http://localhost:3000/",
                changeOrigin: true,
            },
            "/socket.io/": {
                target: "ws://localhost:3000/",
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
