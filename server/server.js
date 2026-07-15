const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Nicht angemeldet." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sitzung abgelaufen, bitte erneut anmelden." });
  }
}

app.post("/api/register", async (req, res) => {
  const { name, firma, username, password } = req.body || {};
  if (!name || !username || !password) {
    return res.status(400).json({ error: "Name, Benutzername und Passwort sind erforderlich." });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Passwort muss mindestens 4 Zeichen haben." });
  }
  const users = db.getUsers();
  const normalizedUsername = String(username).trim().toLowerCase();
  if (users.some((u) => u.username === normalizedUsername)) {
    return res.status(409).json({ error: "Benutzername bereits vergeben." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    firma: firma ? String(firma).trim() : "",
    username: normalizedUsername,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  db.saveUsers(users);
  const token = jwt.sign({ id: user.id, name: user.name, firma: user.firma }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { name: user.name, firma: user.firma, username: user.username } });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const users = db.getUsers();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const user = users.find((u) => u.username === normalizedUsername);
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ error: "Benutzername oder Passwort falsch." });
  }
  const token = jwt.sign({ id: user.id, name: user.name, firma: user.firma }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { name: user.name, firma: user.firma, username: user.username } });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/entries", auth, (req, res) => {
  const entries = db.getEntries().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ entries });
});

app.post("/api/entries", auth, (req, res) => {
  const { thema, status } = req.body || {};
  if (!thema || !status) {
    return res.status(400).json({ error: "Thema und Statusmeldung sind erforderlich." });
  }
  const entries = db.getEntries();
  const entry = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    name: req.user.name,
    firma: req.user.firma,
    thema: String(thema).trim(),
    status: String(status).trim(),
    updatedAt: new Date().toISOString(),
  };
  entries.push(entry);
  db.saveEntries(entries);
  res.status(201).json({ entry });
});

app.put("/api/entries/:id", auth, (req, res) => {
  const { thema, status } = req.body || {};
  const entries = db.getEntries();
  const entry = entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Eintrag nicht gefunden." });
  if (entry.userId !== req.user.id) return res.status(403).json({ error: "Nur eigene Einträge bearbeitbar." });
  if (thema) entry.thema = String(thema).trim();
  if (status) entry.status = String(status).trim();
  entry.updatedAt = new Date().toISOString();
  db.saveEntries(entries);
  res.json({ entry });
});

app.delete("/api/entries/:id", auth, (req, res) => {
  const entries = db.getEntries();
  const entry = entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Eintrag nicht gefunden." });
  if (entry.userId !== req.user.id) return res.status(403).json({ error: "Nur eigene Einträge löschbar." });
  db.saveEntries(entries.filter((e) => e.id !== req.params.id));
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`KI-Status-App läuft auf Port ${PORT}`);
});
