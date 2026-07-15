# KI-Status Board

Installierbare Web-App (PWA): Jeder trägt mit Login ein, woran er/sie gerade mit KI arbeitet
(Name, Firma, Thema, Statusmeldung). Alle Einträge sind für alle angemeldeten Nutzer sichtbar.

## Funktionen

- Registrierung/Login (Benutzername + Passwort, Passwörter gehasht mit bcrypt)
- Gemeinsame Liste aller Einträge, neueste zuerst
- Installierbar auf jedem Smartphone als App (PWA: Manifest + Service Worker)
- Daten werden als JSON-Datei gespeichert (`server/data/`), kein Datenbankserver nötig

## Lokal starten

```
cd server
npm install
npm start
```

Dann im Browser: http://localhost:3000

## Auf dem Smartphone installieren

1. Die App-URL (nach Deployment, siehe unten) auf dem Handy öffnen.
2. **Android/Chrome:** Menü (⋮) → "App installieren" / "Zum Startbildschirm hinzufügen".
3. **iPhone/Safari:** Teilen-Symbol → "Zum Home-Bildschirm".

Die App startet dann wie eine normale App im Vollbild, ohne Browser-Leiste.

## Deployment auf Render.com (empfohlen)

Render.com bietet einen einfachen, verwalteten Node.js-Hosting-Dienst mit persistentem
Speicher, sodass Einträge und Benutzer einen Neustart überleben.

1. Dieses Verzeichnis (`ki-status-app`) in ein GitHub-Repository pushen:
   ```
   git init
   git add .
   git commit -m "Initial commit: KI-Status Board"
   git branch -M main
   git remote add origin <DEINE-GITHUB-REPO-URL>
   git push -u origin main
   ```
2. Auf [render.com](https://render.com) einloggen → **New** → **Blueprint** → das GitHub-Repo
   auswählen. Render erkennt automatisch `render.yaml`.
3. Deploy bestätigen. Render baut die App (`npm install` in `server/`) und startet sie (`npm start`).
4. Nach dem ersten Deploy ist die App unter der von Render vergebenen URL erreichbar
   (z. B. `https://ki-status-app.onrender.com`) – diese URL kann jeder auf dem Smartphone
   öffnen und installieren.

**Kosten:** `render.yaml` nutzt den **Starter-Plan** (aktuell ca. 7 $/Monat), da eine
persistente Disk für Login-Daten und Einträge nötig ist – auf dem kostenlosen Plan
würde das Dateisystem bei jedem Neustart geleert (alle Accounts und Einträge weg).

## Daten sichern

Die Daten liegen in `server/data/users.json` und `server/data/entries.json` (lokal)
bzw. unter `/data/` auf der Render-Disk. Für ein Backup einfach diese Dateien kopieren.

## Sicherheitshinweis

`JWT_SECRET` wird bei lokalem Start zufällig erzeugt (Login-Sitzungen verfallen dann bei
jedem Neustart). Auf Render wird automatisch ein fester, zufälliger Wert generiert
(`generateValue: true` in `render.yaml`), der über Neustarts hinweg stabil bleibt.
