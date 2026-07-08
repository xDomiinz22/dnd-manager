import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Apuntamos @dnd-manager/shared al fuente TS en dev: Vite lo transpila al vuelo
// y así no hay que precompilar shared/dist para trabajar en el frontend.
// En producción (función serverless) sí se usa shared/dist compilado.
const sharedSrc = fileURLToPath(new URL("../shared/src/index.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@dnd-manager/shared": sharedSrc,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
