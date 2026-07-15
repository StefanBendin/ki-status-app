const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const DELETE_PASSWORD = process.env.DELETE_PASSWORD || "Cat#Niom4";

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function clean(val, max) {
  return String(val ?? "").trim().slice(0, max);
}

function parseProgress(val) {
  const n = Number(val);
  if (!Number.isInteger(n) || n < 0 || n > 100 || n % 10 !== 0) return null;
  return n;
}

app.get("/api/entries", (req, res) => {
  const entries = db.getEntries().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ entries });
});

app.post("/api/entries", (req, res) => {
  const name = clean(req.body.name, 100);
  const firma = clean(req.body.firma, 100);
  const thema = clean(req.body.thema, 200);
  const progress = parseProgress(req.body.progress);
  if (!name || !firma || !thema || progress === null) {
    return res.status(400).json({ error: "Name, Firma, Thema und Fortschritt (0-100% in 10er-Schritten) sind erforderlich." });
  }
  const entries = db.getEntries();
  const entry = {
    id: crypto.randomUUID(),
    name,
    firma,
    thema,
    progress,
    updatedAt: new Date().toISOString(),
  };
  entries.push(entry);
  db.saveEntries(entries);
  res.status(201).json({ entry });
});

app.put("/api/entries/:id", (req, res) => {
  const entries = db.getEntries();
  const entry = entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Eintrag nicht gefunden." });
  const progress = parseProgress(req.body.progress);
  if (progress === null) return res.status(400).json({ error: "Fortschritt muss 0-100% in 10er-Schritten sein." });
  entry.progress = progress;
  entry.updatedAt = new Date().toISOString();
  db.saveEntries(entries);
  res.json({ entry });
});

app.delete("/api/entries/:id", (req, res) => {
  const password = clean(req.body?.password, 100);
  if (password !== DELETE_PASSWORD) {
    return res.status(403).json({ error: "Falsches Passwort zum Löschen." });
  }
  const entries = db.getEntries();
  const entry = entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Eintrag nicht gefunden." });
  db.saveEntries(entries.filter((e) => e.id !== req.params.id));
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`KI-Status-App läuft auf Port ${PORT}`);
});
