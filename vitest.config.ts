import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sharedSrc = fileURLToPath(new URL("./shared/src/index.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@dnd-manager/shared": sharedSrc,
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "server/**/*.test.ts"],
  },
});
