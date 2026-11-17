import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "../build",
    emptyOutDir: true,
  },
  server: {
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3001",
      "/auth": "http://localhost:3001",
    },
  },
});
