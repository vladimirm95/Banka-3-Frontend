import { defineConfig } from "cypress";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { dbReset, dbExec } from "./cypress/plugins/db-reset.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve schema/seed paths so `npm run cypress:open` / `cypress:run` work
// without the caller exporting env vars. Order: explicit env override → sibling
// Banka-3-Backend repo (host workflow) → docker mount path (when cypress runs
// inside the bank container).
function resolveSqlPath(envVar, filename) {
  if (process.env[envVar]) return process.env[envVar];
  const localPath = path.resolve(
    __dirname,
    "../Banka-3-Backend/scripts/db",
    filename
  );
  if (fs.existsSync(localPath)) return localPath;
  return `/backend-sql/${filename}`;
}

const SCHEMA_PATH = resolveSqlPath("CYPRESS_SCHEMA_SQL", "schema.sql");
const SEED_PATH = resolveSqlPath("CYPRESS_SEED_SQL", "seed.sql");
const ADMIN_EMAIL = process.env.CYPRESS_ADMIN_EMAIL || "admin@banka.raf";
const CLIENT_EMAIL = process.env.CYPRESS_CLIENT_EMAIL || "petar@primer.raf";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
    setupNodeEvents(on) {
      // Default to bank,gateway,exchange so an out-of-the-box `cypress:open`
      // / `cypress:run` flushes in-memory state on each db:reset. Without
      // this, supervisor login starts returning 401 partway through a full
      // run as services hold stale references to old IDs. Set the env var
      // to an empty string to opt out (e.g. cypress-inside-docker, where the
      // runner can't reach the host's docker socket).
      const RESTART_CONTAINERS =
        process.env.CYPRESS_RESTART_CONTAINERS != null
          ? process.env.CYPRESS_RESTART_CONTAINERS
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : ["bank", "gateway", "exchange"];
      on("task", {
        "db:reset": () =>
          dbReset({
            schemaPath: SCHEMA_PATH,
            seedPath: SEED_PATH,
            vars: { admin_email: ADMIN_EMAIL, client_email: CLIENT_EMAIL },
            restartContainers: RESTART_CONTAINERS,
          }),
        "db:exec": ({ sql, params }) => dbExec({ sql, params }),
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
