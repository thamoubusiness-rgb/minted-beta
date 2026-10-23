// Runs db/schema.sql against DATABASE_URL. Safe to run on every deploy (all statements are "if not exists").
// If DATABASE_URL isn't set yet (first deploy), it skips instead of failing the build.
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL is not set: skipping database setup. Add it and redeploy.");
  process.exit(0);
}
const sql = postgres(url, { prepare: false, max: 1 });
try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
  console.log("Database schema is up to date");
} catch (e) {
  console.error("Migration failed:", e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
