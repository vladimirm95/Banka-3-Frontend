import fs from "fs";
import http from "http";
import pg from "pg";

const { Client } = pg;

function dockerPost(socketPath, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath, path, method: "POST" },
      (res) => {
        res.resume();
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`docker ${path} → ${res.statusCode}`));
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForGateway(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: 8080,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            timeout: 2000,
          },
          (res) => {
            res.resume();
            res.on("end", () => resolve());
          }
        );
        req.on("error", reject);
        req.on("timeout", () => req.destroy(new Error("timeout")));
        req.end(JSON.stringify({ email: "x", password: "x" }));
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("gateway didn't come back up");
}

export async function dbReset({
  schemaPath,
  seedPath,
  vars,
  restartContainers = ["bank", "gateway"],
  dockerSocket = "/var/run/docker.sock",
}) {
  const client = new Client({
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || "banka",
    password: process.env.PG_PASSWORD || "banka_secret",
    database: process.env.PG_DB || "banka",
  });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);

    let seedSql = fs.readFileSync(seedPath, "utf8");
    for (const [k, v] of Object.entries(vars || {})) {
      const escaped = String(v).replace(/'/g, "''");
      seedSql = seedSql.replace(new RegExp(`:'${k}'`, "g"), `'${escaped}'`);
    }
    await client.query(seedSql);
  } finally {
    await client.end();
  }

  if (fs.existsSync(dockerSocket) && restartContainers.length > 0) {
    for (const name of restartContainers) {
      await dockerPost(dockerSocket, `/containers/${name}/restart?t=2`);
    }
    await waitForGateway();
  }

  return null;
}
