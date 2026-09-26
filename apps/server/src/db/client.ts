// Opens the SQLite database in WAL mode, applies migrations and exposes both the Drizzle and raw clients.
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DATA_DIR, paths } from "../config";
import * as schema from "./schema";

mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(paths.db);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: paths.migrations });
