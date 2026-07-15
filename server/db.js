const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ENTRIES_FILE)) fs.writeFileSync(ENTRIES_FILE, "[]");
}

function readJson(file) {
  ensureStore();
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  getEntries: () => readJson(ENTRIES_FILE),
  saveEntries: (entries) => writeJson(ENTRIES_FILE, entries),
};
