import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: true,
    port: 5299,
    strictPort: true,
  },
  test: {
    environment: "node",
  },
});
