# KI-Status Board

Installierbare Web-App (PWA): Jeder trägt ein, woran er/sie gerade mit KI arbeitet
(Name, Firma, Thema, Fortschritt in %). Alle Einträge sind für alle Nutzer sichtbar, kein Login nötig.

## Funktionen

- Formular für Name, Firma, Thema und Fortschritt (Auswahl in 10%-Schritten) – ohne Anmeldung
- Fortschritt wird als Balkengrafik dargestellt und kann pro Eintrag jederzeit per Dropdown angepasst werden
- Gemeinsame Liste aller Einträge, neueste zuerst
- Löschen ist durch ein gemeinsames Passwort geschützt (siehe unten), damit nicht jeder Einträge anderer löschen kann
- Installierbar auf jedem Smartphone als App (PWA: Manifest + Service Worker)
- Daten werden als JSON-Datei gespeichert (`server/data/entries.json`), kein Datenbankserver nötig

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

## Als App installieren (PWA)

1. Die App-URL (nach Deployment, siehe unten) auf dem Handy öffnen.
2. **Android/Chrome:** Menü (⋮) → "App installieren" / "Zum Startbildschirm hinzufügen".
3. **iPhone/Safari:** Teilen-Symbol → "Zum Home-Bildschirm".

Die App startet dann wie eine normale App im Vollbild, ohne Browser-Leiste.

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
   mit `plan: free`. Da `DELETE_PASSWORD` als `sync: false` markiert ist, fragt Render beim
   Erstellen nach einem Wert dafür – dort ein eigenes Lösch-Passwort eintragen (wird nicht
   im Repo gespeichert).
3. Deploy bestätigen. Render baut die App (`npm install` in `server/`) und startet sie
   (`npm start`).
4. Nach dem ersten Deploy ist die App unter der von Render vergebenen URL erreichbar
   (z. B. `https://ki-status-app.onrender.com`) – öffentlich, ohne Login, komplett kostenlos.

**Wichtig zu Speicher (kostenloser Plan):** Der Free-Plan hat kein persistentes Laufwerk –
`entries.json` liegt im normalen Dateisystem des Containers. Nach 15 Minuten Inaktivität
schläft der Dienst ein (dauert beim nächsten Aufruf ca. 30–60 Sekunden zum Aufwachen) und
bei jedem Einschlafen/Redeploy werden die Einträge zurückgesetzt. Für ein "wer arbeitet
gerade woran"-Board ist das meist unkritisch, da die Einträge ohnehin nur kurzfristig
relevant sind.

Falls dauerhafte Speicherung wichtiger wird als "kostenlos", kann später auf den
**Starter-Plan** (kostenpflichtig, ca. 7 $/Monat) mit persistenter Disk umgestellt werden –
dafür in `render.yaml` wieder eine `disk:`-Sektion und `envVars: DATA_DIR=/data` ergänzen.

## Daten sichern

Die Einträge liegen in `server/data/entries.json`. Für ein Backup einfach diese Datei kopieren.
