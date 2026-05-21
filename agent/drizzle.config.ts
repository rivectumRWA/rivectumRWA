import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DB_PATH ?? "./agent.db" },
});
