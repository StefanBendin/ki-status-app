# KI-Status Board

Installierbare Web-App (PWA): Jeder trägt ein, woran er/sie gerade mit KI arbeitet
(Name, Firma, Thema, Fortschritt in %). Alle Einträge sind für alle Nutzer sichtbar, kein Login nötig.

## Funktionen

- Formular für Name, Firma, Thema und Fortschritt (Auswahl in 10%-Schritten) – ohne Anmeldung
- Fortschritt wird als Balkengrafik dargestellt und kann pro Eintrag jederzeit per Dropdown angepasst werden
- Gemeinsame Liste aller Einträge, neueste zuerst
- Löschen ist durch ein gemeinsames Passwort geschützt (siehe unten), damit nicht jeder Einträge anderer löschen kann
- Installierbar auf jedem Smartphone als App (PWA: Manifest + Service Worker)
- Daten liegen dauerhaft in einer kostenlosen Postgres-Datenbank (siehe unten), überleben also
  Redeploys und Neustarts. Lokal ohne konfigurierte Datenbank wird automatisch auf eine
  JSON-Datei (`server/data/entries.json`) zurückgefallen, damit man ohne Zusatz-Setup testen kann.

## Lösch-Passwort

Beim Löschen eines Eintrags wird ein Passwort abgefragt. Es wird über die Umgebungsvariable
`DELETE_PASSWORD` gesetzt. Ist die Variable nicht gesetzt, gilt lokal ein Standardwert (siehe
`server/server.js`, dort nicht öffentlich dokumentiert) – für den produktiven Einsatz
unbedingt ein eigenes Passwort in Render setzen (siehe unten).

## Lokal starten

```
cd server
npm install
npm start
```

Dann im Browser: http://localhost:3001

Ohne `DATABASE_URL` werden die Einträge lokal in `server/data/entries.json` gespeichert – gut
zum schnellen Testen. Für einen lokalen Test mit echter Datenbank einfach `DATABASE_URL` vor
`npm start` setzen (siehe nächster Abschnitt).

## Als App installieren (PWA)

1. Die App-URL (nach Deployment, siehe unten) auf dem Handy öffnen.
2. **Android/Chrome:** Menü (⋮) → "App installieren" / "Zum Startbildschirm hinzufügen".
3. **iPhone/Safari:** Teilen-Symbol → "Zum Home-Bildschirm".

Die App startet dann wie eine normale App im Vollbild, ohne Browser-Leiste.

## Kostenlose Datenbank einrichten (Neon)

Damit Einträge Redeploys und Neustarts überleben, braucht die App eine echte Datenbank statt
der lokalen Datei. [Neon](https://neon.tech) bietet dafür eine kostenlose Postgres-Datenbank
(keine Kreditkarte nötig, Speicher bleibt dauerhaft erhalten, auch wenn die Datenbank bei
Inaktivität kurz "einschläft" und beim nächsten Zugriff automatisch wieder aufwacht).

1. Auf [neon.tech](https://neon.tech) ein kostenloses Konto anlegen und ein neues Projekt
   erstellen.
2. Im Projekt-Dashboard die **Connection string** kopieren (Format
   `postgres://user:passwort@host/datenbank?sslmode=require`).
3. Diese Connection-String-URL als Umgebungsvariable `DATABASE_URL` in Render hinterlegen
   (siehe nächster Abschnitt) – die App legt die benötigte Tabelle beim Start automatisch an.

## Deployment auf Render.com (kostenlos)

1. Dieses Verzeichnis (`ki-status-app`) in das GitHub-Repository pushen (Remote ist bereits
   auf `github.com/StefanBendin/ki-status-app` konfiguriert):
   ```
   git add -A
   git commit -m "Login entfernt, echter Gratis-Plan"
   git push
   ```
2. Auf [render.com](https://render.com) einloggen (kostenloses Konto reicht) → **New** →
   **Blueprint** → das GitHub-Repo auswählen. Render erkennt automatisch `render.yaml`
   mit `plan: free`. Da `DELETE_PASSWORD` und `DATABASE_URL` als `sync: false` markiert sind,
   fragt Render beim Erstellen nach Werten dafür – dort das eigene Lösch-Passwort und die
   Neon-Connection-String eintragen (werden nicht im Repo gespeichert).
   - War der Render-Service schon vorher eingerichtet, `DATABASE_URL` stattdessen nachträglich
     unter **Environment** beim bestehenden Service ergänzen und einmal manuell neu deployen.
3. Deploy bestätigen. Render baut die App (`npm install` in `server/`) und startet sie
   (`npm start`).
4. Nach dem ersten Deploy ist die App unter der von Render vergebenen URL erreichbar
   (z. B. `https://ki-status-app.onrender.com`) – öffentlich, ohne Login, komplett kostenlos.

**Speicher (kostenloser Plan):** Der Render-Free-Plan hat kein persistentes Laufwerk, deshalb
liegen die Einträge nicht mehr im Dateisystem des Containers, sondern in der Neon-Datenbank
(siehe oben). Damit überleben sie Redeploys, Neustarts und das Einschlafen nach 15 Minuten
Inaktivität (das Aufwachen dauert dann ca. 30–60 Sekunden). Ist `DATABASE_URL` nicht gesetzt,
fällt die App automatisch auf die lokale Datei zurück – dann gehen Einträge bei jedem
Neustart verloren.

## Daten sichern

Mit Neon: im Neon-Dashboard über **SQL Editor** `SELECT * FROM entries;` ausführen oder einen
regulären Postgres-Dump ziehen. Ohne Datenbank (lokaler Fallback) liegen die Einträge in
`server/data/entries.json` – für ein Backup einfach diese Datei kopieren.
