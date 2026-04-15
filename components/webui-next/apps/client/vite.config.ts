import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {defineConfig, type UserConfig} from "vite";


// https://vite.dev/config/
export default defineConfig({
    base: "./",
    build: {
        target: "esnext",
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("monaco-editor")) {
                        return "monaco";
                    }
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
    },
    server: {
        port: Number(process.env.VITE_PORT ?? 4001),
        proxy: {
            // Below targets should match the server's configuration in
            // `components/webui-next/server/.env` (or `.env.local` if overridden)
            "/api/": {
                target: `http://localhost:${process.env.SERVER_PORT ?? 3000}/`,
                changeOrigin: true,
            },
            "/socket.io/": {
                target: `ws://localhost:${process.env.SERVER_PORT ?? 3000}/`,
                changeOrigin: true,
                ws: true,
            },
        },
    },
} as UserConfig);
