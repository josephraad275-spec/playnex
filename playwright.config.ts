import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://127.0.0.1:5173", headless: true },
  webServer: {
    command:
      'npx concurrently -k "node --import tsx tests/e2e/server.ts" "npm run dev:web"',
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
  },
  reporter: "list",
});
