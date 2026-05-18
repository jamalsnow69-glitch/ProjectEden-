import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/chat": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/auth": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/search": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/read-url": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/memory": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/training": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/train": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 120000
      },

      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  }
});