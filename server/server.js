const express = require("express");
const path = require("path");
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

function asyncHandler(handler) {
  return (req, res) => {
    handler(req, res).catch((err) => {
      console.error(err);
      res.status(503).json({ error: "Datenbank momentan nicht erreichbar, bitte gleich erneut versuchen." });
    });
  };
}

app.get(
  "/api/entries",
  asyncHandler(async (req, res) => {
    const entries = await db.listEntries();
    res.json({ entries });
  })
);

app.post(
  "/api/entries",
  asyncHandler(async (req, res) => {
    const name = clean(req.body.name, 100);
    const firma = clean(req.body.firma, 100);
    const thema = clean(req.body.thema, 200);
    const progress = parseProgress(req.body.progress);
    if (!name || !firma || !thema || progress === null) {
      return res.status(400).json({ error: "Name, Firma, Thema und Fortschritt (0-100% in 10er-Schritten) sind erforderlich." });
    }
    const entry = await db.createEntry({ name, firma, thema, progress });
    res.status(201).json({ entry });
  })
);

app.put(
  "/api/entries/:id",
  asyncHandler(async (req, res) => {
    const progress = parseProgress(req.body.progress);
    if (progress === null) return res.status(400).json({ error: "Fortschritt muss 0-100% in 10er-Schritten sein." });
    const entry = await db.updateProgress(req.params.id, progress);
    if (!entry) return res.status(404).json({ error: "Eintrag nicht gefunden." });
    res.json({ entry });
  })
);

app.delete(
  "/api/entries/:id",
  asyncHandler(async (req, res) => {
    const password = clean(req.body?.password, 100);
    if (password !== DELETE_PASSWORD) {
      return res.status(403).json({ error: "Falsches Passwort zum Löschen." });
    }
    const deleted = await db.deleteEntry(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Eintrag nicht gefunden." });
    res.status(204).end();
  })
);

app.listen(PORT, () => {
  console.log(`KI-Status-App läuft auf Port ${PORT}`);
});
