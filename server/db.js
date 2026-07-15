const crypto = require("crypto");
const DATABASE_URL = process.env.DATABASE_URL;

module.exports = DATABASE_URL ? createPostgresDb(DATABASE_URL) : createFileDb();

function createPostgresDb(connectionString) {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  pool.on("error", (err) => console.error("Unerwarteter Postgres-Verbindungsfehler:", err.message));

  // Swallow init failures here so a transient DB outage at startup can't crash
  // the process via an unhandled rejection; the next real query will fail (and
  // be caught) normally if the database is still unreachable.
  const ready = pool
    .query(
      `CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        firma TEXT NOT NULL,
        thema TEXT NOT NULL,
        progress INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`
    )
    .then(() => pool.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT ''`))
    .catch((err) => {
      console.error("Postgres-Initialisierung fehlgeschlagen:", err.message);
    });

  function rowToEntry(row) {
    return {
      id: row.id,
      name: row.name,
      firma: row.firma,
      thema: row.thema,
      progress: row.progress,
      updatedAt: row.updated_at.toISOString(),
      ownerId: row.owner_id,
    };
  }

  return {
    async listEntries() {
      await ready;
      const { rows } = await pool.query("SELECT * FROM entries ORDER BY updated_at DESC");
      return rows.map(rowToEntry);
    },

    async getEntry(id) {
      await ready;
      const { rows } = await pool.query("SELECT * FROM entries WHERE id = $1", [id]);
      return rows[0] ? rowToEntry(rows[0]) : null;
    },

    async createEntry({ name, firma, thema, progress, ownerId }) {
      await ready;
      const id = crypto.randomUUID();
      const updatedAt = new Date();
      await pool.query(
        "INSERT INTO entries (id, name, firma, thema, progress, updated_at, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [id, name, firma, thema, progress, updatedAt, ownerId]
      );
      return { id, name, firma, thema, progress, updatedAt: updatedAt.toISOString(), ownerId };
    },

    async updateProgress(id, progress) {
      await ready;
      const updatedAt = new Date();
      const { rows } = await pool.query(
        "UPDATE entries SET progress = $1, updated_at = $2 WHERE id = $3 RETURNING *",
        [progress, updatedAt, id]
      );
      return rows[0] ? rowToEntry(rows[0]) : null;
    },

    async deleteEntry(id) {
      await ready;
      const { rowCount } = await pool.query("DELETE FROM entries WHERE id = $1", [id]);
      return rowCount > 0;
    },
  };
}

function createFileDb() {
  const fs = require("fs");
  const path = require("path");
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
  const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");

  function ensureStore() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ENTRIES_FILE)) fs.writeFileSync(ENTRIES_FILE, "[]");
  }

  function readAll() {
    ensureStore();
    return JSON.parse(fs.readFileSync(ENTRIES_FILE, "utf8"));
  }

  function writeAll(entries) {
    ensureStore();
    fs.writeFileSync(ENTRIES_FILE, JSON.stringify(entries, null, 2));
  }

  return {
    async listEntries() {
      return readAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async getEntry(id) {
      return readAll().find((e) => e.id === id) || null;
    },

    async createEntry({ name, firma, thema, progress, ownerId }) {
      const entries = readAll();
      const entry = {
        id: crypto.randomUUID(),
        name,
        firma,
        thema,
        progress,
        updatedAt: new Date().toISOString(),
        ownerId,
      };
      entries.push(entry);
      writeAll(entries);
      return entry;
    },

    async updateProgress(id, progress) {
      const entries = readAll();
      const entry = entries.find((e) => e.id === id);
      if (!entry) return null;
      entry.progress = progress;
      entry.updatedAt = new Date().toISOString();
      writeAll(entries);
      return entry;
    },

    async deleteEntry(id) {
      const entries = readAll();
      const filtered = entries.filter((e) => e.id !== id);
      writeAll(filtered);
      return filtered.length !== entries.length;
    },
  };
}
