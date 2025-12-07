// content.js - DOM-Extraktion & Text-Filterung

// === DOM Extractor ===
function getFullText() {
  return document.body.textContent || '';
}

function getDOMFilteredText(filters) {
  const { domInclude = [], domExclude = [] } = filters;
  
  let elements = [document.body];
  
  // Wenn Include-Selektoren vorhanden, nur diese berücksichtigen
  if (domInclude.length > 0) {
    const included = new Set();
    domInclude.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => included.add(el));
      } catch (e) {
        console.warn(`Invalid include selector: ${selector}`);
      }
    });
    elements = Array.from(included);
  }
  
  // Exclude-Selektoren sammeln
  const excluded = new Set();
  domExclude.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => excluded.add(el));
    } catch (e) {
      console.warn(`Invalid exclude selector: ${selector}`);
    }
  });
  
  // Text extrahieren, exclusions beachten
  let text = '';
  elements.forEach(el => {
    if (!excluded.has(el) && !Array.from(excluded).some(excl => excl.contains(el))) {
      text += el.textContent || '';
    }
  });
  
  return text;
}

function applyRegexFilter(text, regexPattern) {
  if (!regexPattern || regexPattern.trim() === '') {
    return text;
  }
  
  try {
    const regex = new RegExp(regexPattern, 'g');
    const matches = text.match(regex);
    return matches ? matches.join('\n') : '';
  } catch (e) {
    console.warn(`Invalid regex: ${regexPattern}`);
    return text;
  }
}

function extractFilteredText(filters) {
  const domText = getDOMFilteredText(filters);
  const regexFiltered = applyRegexFilter(domText, filters.regex);
  return regexFiltered || domText;
}

// === Message Handler ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'getFullText': {
        const text = getFullText();
        sendResponse({ success: true, text });
        break;
      }

      case 'getFilteredDOMText': {
        const text = extractFilteredText(request.filters);
        sendResponse({ success: true, text });
        break;
      }

      case 'getDebugInfo': {
        const fullText = getFullText();
        const filteredText = extractFilteredText(request.filters);
        sendResponse({
          success: true,
          fullText,
          filteredDOMText: filteredText
        });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
});
