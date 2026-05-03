import { defineConfig } from "cypress";
import { dbReset } from "./cypress/plugins/db-reset.js";

const SCHEMA_PATH =
  process.env.CYPRESS_SCHEMA_SQL || "/backend-sql/schema.sql";
const SEED_PATH = process.env.CYPRESS_SEED_SQL || "/backend-sql/seed.sql";
const ADMIN_EMAIL = process.env.CYPRESS_ADMIN_EMAIL || "admin@banka.raf";
const CLIENT_EMAIL = process.env.CYPRESS_CLIENT_EMAIL || "petar@primer.raf";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
    setupNodeEvents(on) {
      on("task", {
        "db:reset": () =>
          dbReset({
            schemaPath: SCHEMA_PATH,
            seedPath: SEED_PATH,
            vars: { admin_email: ADMIN_EMAIL, client_email: CLIENT_EMAIL },
          }),
      });
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
  },

  env: {
    INTEGRATION: process.env.CYPRESS_INTEGRATION === "true",
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
