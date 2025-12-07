# backseat-helper
Backseat Driver Extension: Funktionsbeschreibung & Anforderungen
Grundidee

Die Erweiterung ("Backseat Driver") hilft dem Nutzer, Webseiten zu hinterfragen, Formulare auszufüllen und neue Perspektiven zu entdecken. Die KI arbeitet als diskreter Co-Pilot ("Backseat Driver") im Browser.

Hauptfunktionen

Collapsible Chat-Panel am unteren Rand der Seite (volle Breite, rund, aber ohne Schatten). Darunter ein einblendbares Logging/Debug-Fenster.

Profile:

Speichern von individuellen Profilen mit folgenden Infos:

Ollama URL (Serveradresse)

Modell (z.B. llama3)

OCR-Server URL (optional, z.B. /tesseract)

Prompt (Systemprompt, frei editierbar, pro Profil)

Sprachen für OCR (z.B. "deu,eng")

Textfilter (Regex)

DOM-Filter (CSS-Selektoren, + für Include, - für Exclude, eine Zeile pro Selektor)

Import / Export der Profile als Datei/JSON/Text

Auswahl des Profils über das Chatfenster

Beim Wechseln des Profils werden alle zugehörigen Einstellungen übernommen.

Workflow

Screenshot erstellen (über Button im Chatpanel)
→ Das Bild wird per OCR-Server ausgewertet.
→ Nur das OCR-Textresultat wird an die KI geschickt, mit Bezug auf Prompt und evtl. Chatfrage.
→ Antwort der KI wird im Chatpanel angezeigt.

Gesamter Seitentext extrahieren

Strg+A (Select All): Gesamter sichtbarer Text der Seite wird extrahiert

DOM-basiert: Optional dom-basiert gefiltert (siehe Filter unten)

Ergebnis wird zuerst durch DOM-Filter, dann Textfilter (Regex) gejagt, und im Logfenster angezeigt.

Noch kein Versand an die KI (nur Ansicht).

URL, Prompt, Modell, Sprache, OCR-URL werden jeweils automatisch vorausgefüllt und gespeichert.

Debug/Logging:

Schalter im Chatpanel: Zeigt alle aktuell verwendeten Daten/Inputs an (inkl. Anzahl Zeichen).

Debug-Ausgaben erscheinen im Logging-Fenster.

Filter-Konfiguration

Im Profil sind zwei editierbare Textfelder:

Textfilter: Regex (wird auf extrahierten Text angewendet)

DOM-Filter: CSS-Selektoren (eine Zeile pro Selektor, Präfix + oder -)

Beispiel:

+main
-nav
-footer


Filter sind pro Profil speicherbar und werden beim Extrahieren/Versenden angewendet.

Weitere Hinweise

Kein Hotkey-Support.

Jedes Profil kann genau einen Ollama- und einen OCR-Server nutzen.

Lange Texte (ggf. Stückelung) sollen unterstützt werden (später).

Standardprofil/-werte direkt mitliefern (sodass bei frischer Installation alles ausgefüllt ist).

UX: Modern, clean, aber nicht fancy. Keine Schatten, nur sanft gerundet.