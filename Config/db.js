// server/Config/db.js
import pkg from "pg";
import { env } from "./env.js";
const { Pool } = pkg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
});

pool.on("connect", () => console.log("Connected to PostgreSQL"));
pool.on("error", (err) => console.error("Database connection error:", err));
