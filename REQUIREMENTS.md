# Backseat Helper – Chrome Extension
## Anforderungsdokument (REQUIREMENTS)

### Ziel
Kritischer, KI-gestützter Begleiter für Webseiten. Nutzer können Profile mit unterschiedlichen KI- und OCR-Einstellungen anlegen und verwalten.

### Technologie-Stack
- **Manifest V3** (Chrome Extension Standard)
- **Vanilla JS** (KEIN Framework)
- **Keine Inline-JS** (CSP-konform)
- **Minimalistische UI** (clean, keine Schatten, sanft gerundet)

---

## 1. Dateien & Grundstruktur

| Datei | Aufgabe |
|-------|---------|
| `manifest.json` | Manifest V3, externe Scripts nur |
| `src/background.js` | Service Worker: Profile, KI, OCR, Datenmanagement |
| `src/content.js` | DOM-Extraktion & Text-Filterung |
| `src/chat-panel.js` | Chat-UI unten + Debug-Panel |
| `src/options.html` + `options.js` | Profilverwaltung, Import/Export |
| `src/popup.html` | Minimal, Schnellzugriff |
| `assets/icon-*.svg` | Icons (16x16, 48x48, 128x128) |

---

## 2. Profil-System

### Profil-Struktur
```javascript
{
  name: string,                    // z.B. "Arbeit"
  ollamaUrl: string,               // z.B. "http://localhost:11434"
  model: string,                   // z.B. "llama3"
  ocrUrl: string,                  // Default: "http://localhost:8884/tesseract"
  ocrLanguages: string[],          // z.B. ["deu", "eng"]
  prompt: string,                  // System-Prompt
  filters: {
    regex: string,                 // Regex-Pattern zum Text-Filtern
    domInclude: string[],          // CSS-Selektoren (einschließen)
    domExclude: string[]           // CSS-Selektoren (ausschließen)
  }
}
```

### Funktionen
- ✅ Profile anlegen, ändern, löschen
- ✅ Export/Import als JSON
- ✅ Default-Profil automatisch bei Installation
- ✅ chrome.storage.sync für Speicherung

---

## 3. Screenshot & OCR-Workflow

1. **Screenshot**: `chrome.tabs.captureVisibleTab()` → PNG (DataURL)

2. **Wichtig: Datei-Upload (multipart/form-data)**

- Der OCR-Server erwartet einen echten Datei-Upload im Multipart-Form-Body.
- Feld `file`: das Bild als Datei/Blob (z. B. `screenshot.png`). Nicht: JSON mit Base64-String.
- Feld `options`: ein JSON-String mit Einstellungen, z. B. `{"languages":["deu","eng"]}`.

Beispiel HTTP (curl):

```bash
curl -X POST \
  -F 'options={"languages":["deu","eng"]}' \
  -F file=@test.png \
  http://localhost:8884/tesseract
```

3. **DataURL → Blob**

- `chrome.tabs.captureVisibleTab()` liefert eine DataURL (base64). Vor dem Senden an `/tesseract` muss diese DataURL in ein `Blob`/`File` umgewandelt werden.
- Beispiel-Helper (Browser):

```javascript
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const b64 = parts[1];
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// Dann:
// const blob = dataUrlToBlob(imageDataUrl);
// formData.append('file', blob, 'screenshot.png');
// formData.append('options', JSON.stringify({ languages: ['deu','eng'] }));
```

4. **OCR-Antwort**: Nur Text-Output wird an die KI weitergegeben.

5. **Keine Speicherung**: Screenshot/Blob werden nach OCR verworfen (keine Persistenz).

---

## 4. DOM-Extraktion & Text-Backup

### DOM-Extraktion
- Anwendung von `filters.regex`, `domInclude`, `domExclude`
- **Nur im Debug anzeigen**, nicht an KI senden
- Ergebnis: gefilterte Textversion der Seite

### Fulltext / STRG+A
- Gesamter Seiteninhalt (`document.body.textContent`)
- **Nur im Debug sichtbar** als Backup
- Hilft bei Diagnose

---

## 5. Prompt-Building & KI-Request

### Was an die KI geht (nichts anderes!)
1. **Profil-Prompt**: System-Instruktion (aus Profil)
2. **OCR-Text**: Inhalt vom Screenshot
3. **User-Frage**: Optional vom Chat-Input

### Format
```
System: <prompt>

Content:
<ocrText>

User question: <userQuestion>
```

---

## 6. Chat- & Debug-UI

### Chat-Panel
- **Position**: Unten rechts, volle Breite
- **Verhalten**: Collapsible (ein-/ausklappbar)
- **Buttons**:
  - 📸 Screenshot senden
  - ➜ Frage senden (oder ENTER)
- **Nachrichtenfluss**: User / KI / Fehler unterschiedlich farblich

### Debug-Panel
- **Separat umschaltbar** (unter Chat-Panel)
- **Zeigt**: OCR-Text, DOM-Text, Full-Text, KI-Prompt, KI-Antwort, Fehler
- **Rohe Daten**, keine Formatierung

### Design
- Modern, clean
- Keine Schatten
- Sanft gerundete Ecken (border-radius)
- Responsive (Mobile OK)

---

## 7. Debug-Modus

### Umschalter
- Button im Chat-Panel (🐛)
- Ein/Aus

### Was wird angezeigt
- ✅ OCR-Text
- ✅ Gefilterter DOM-Text
- ✅ Full-Text
- ✅ Finaler KI-Prompt
- ✅ KI-Antwort
- ✅ Fehler (HTTP, Parsing, etc.)
- ✅ Charakter-Längen aller Ausgaben

---

## 8. Technische Anforderungen

### CSP & Manifest V3
- **Keine Inline-JS** in HTML
- Alle Scripts externe Dateien
- Event-Listener via JavaScript (.js-Dateien)
- No `eval()`, kein unsicherer Content

### Fehlerbehandlung
- Try-catch für alle API-Calls
- User-freundliche Fehlermeldungen im Chat
- Timeouts für OCR/KI-Requests (z.B. 30s)

### Performance
- **Text-Chunking**: Für sehr lange Texte (später, optional)
- **OCR-Caching**: Nicht implementiert (MVP)
- **DOM-Parsing**: Lazy auf Demand

### Speicherung
- **Profil-Daten**: `chrome.storage.sync`
- **Chat-Verlauf**: Nicht persistent (nur Session)
- **Screenshots**: Nicht gespeichert

---

## 9. Offene Spezifikationen (MVP)

| Punkt | Status |
|-------|--------|
| Regex-Filter konfigurierbar | ✅ Ja (Textfeld) |
| DOM-Include/Exclude | ✅ Ja (CSS-Selektoren, Zeilenweise) |
| Standard-OCR-URL | `http://localhost:8884/tesseract` |
| Browser-Support | Chrome (MV3 first) |
| Hotkey-Support | ❌ Nein (nur Buttons) |
| Text-Chunking | ❌ Nein (später) |
| Chat-Verlauf-Speicherung | ❌ Nein (Session only) |

---

## 10. Installation & Entwicklung

### Lokal laden
```bash
# Chrome öffnen → chrome://extensions
# Developer Mode AN
# Load unpacked → /backseat-helper Ordner
```

### Dependencies
- Chrome 88+ (Manifest V3)
- Ollama Server (lokal oder Remote)
- OCR-Server (z.B. Tesseract)

### Erste Tests
1. Extension aktivieren
2. Options öffnen → Default-Profil prüfen
3. Webseite öffnen → Chat-Panel sollte sichtbar sein
4. Screenshot → OCR testen
5. Debug-Modus → Alle Texte sichtbar
