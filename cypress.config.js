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
      // Restart-list defaults to ["bank","gateway"] inside dbReset, but the
      // Cypress runner inside cypress/included can't reach the Docker socket
      // on Windows (named pipe vs unix socket). Empty list keeps the schema
      // wipe + seed but skips the docker-restart step — services pick up the
      // refreshed data on their next request.
      const RESTART_CONTAINERS =
        process.env.CYPRESS_RESTART_CONTAINERS != null
          ? process.env.CYPRESS_RESTART_CONTAINERS
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      on("task", {
        "db:reset": () =>
          dbReset({
            schemaPath: SCHEMA_PATH,
            seedPath: SEED_PATH,
            vars: { admin_email: ADMIN_EMAIL, client_email: CLIENT_EMAIL },
            restartContainers: RESTART_CONTAINERS,
          }),
      });
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    // The /tax page occasionally renders blank on the first cy.visit after a
    // db:reset under full-suite ordering against `npm run dev` — Vite HMR's
    // socket reconnect after the AUT iframe reset sporadically wedges the
    // first navigation. One retry recovers; runMode-only so isolated runs
    // stay deterministic.
    retries: { runMode: 2, openMode: 0 },
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
