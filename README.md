# backseat-helper
Backseat Driver Extension: Funktionsbeschreibung & Anforderungen
Bitte erstelle eine komplett neue Chrome‑Extension (Manifest V3, Vanilla‑JS, keine Frameworks).

1. Grundstruktur

background.js (KI/OCR/Profil‑Logik)

content.js (DOM‑Extraktion)

chat-panel.js (UI der unteren Konsole + Debug‑Fenster)

options.html + options.js (Profilverwaltung)

popup.html (minimal)

manifest.json

2. Profil-System

Jedes Profil enthält:

name

ollamaUrl

model

ocrUrl

ocrLanguages (Array)

prompt

filters.regex (string)

filters.domInclude (array)

filters.domExclude (array)

Funktionen:

speichern/ändern/löschen

export/import als JSON

Default-Profil automatisch anlegen

3. Screenshot & OCR

chrome.tabs.captureVisibleTab → PNG

an OCR senden

OCR-Antwort (stdout) ist der Haupttext, der später an KI geht

4. DOM-Extraktion

Nur anzeigen, NICHT an KI schicken
Filter:

regex: anwenden

domInclude/domExclude: anwenden

5. Gesamtes Seiten-Text-Backup

STRG+A‑Äquivalent (textContent der Seite)
Nur im Debug anzeigen.

6. Prompt-Build

Die KI erhält NUR:

prompt (aus Profil)

Frage (falls gestellt)

OCR‑Text (als Content)

Keine anderen Quellen zuerst!

7. Chat-Schnittstelle

Schubladenpanel am unteren Bildschirmrand

Ein-/Ausklappbar

Logging‑Fenster dadrunter (separat ein-/ausklappbar)

Buttons:

Screenshot senden

Fragen senden

8. Debug-Modus

Ein/Aus‑Schalter
Bei AN:

zeige OCR‑Text

zeige DOM‑Text gefiltert

zeige Full‑Text

zeige finalen KI‑Prompt

zeige KI‑Antwort

zeige Fehlermeldungen

keine Sonderbehandlung → rohe Daten sichtbar

9. Keine Hotkeys

Nur Buttons.