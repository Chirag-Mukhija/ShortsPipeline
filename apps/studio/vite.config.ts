// Vite config for the studio: React, Tailwind, and a dev proxy to the ClipForge server for API calls and media files.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const server = `http://127.0.0.1:${process.env.SERVER_PORT ?? 4310}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 2000 },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: server, changeOrigin: true },
      "/files": { target: server, changeOrigin: true },
    },
  },
});
