// content.js - DOM-Extraktion und Filter

class DOMExtractor {
  constructor(filters) {
    this.regexFilter = filters.regex ? new RegExp(filters.regex, 'g') : null;
    this.domInclude = filters.domInclude || [];
    this.domExclude = filters.domExclude || [];
  }

  getFullText() {
    return document.body.textContent || '';
  }

  getDOMFilteredText() {
    let elements = [document.body];

    // Apply include selectors
    if (this.domInclude.length > 0) {
      const included = new Set();
      this.domInclude.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => included.add(el));
        } catch (e) {
          console.warn(`Invalid selector: ${selector}`);
        }
      });
      elements = Array.from(included);
    }

    // Apply exclude selectors
    const excluded = new Set();
    this.domExclude.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => excluded.add(el));
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`);
      }
    });

    // Extract text from included elements, excluding blacklisted ones
    let text = '';
    elements.forEach(el => {
      if (!excluded.has(el) && !Array.from(excluded).some(excl => excl.contains(el))) {
        text += el.textContent || '';
      }
    });

    return text;
  }

  applyRegexFilter(text) {
    if (!this.regexFilter) {
      return text;
    }
    
    const matches = text.match(this.regexFilter);
    return matches ? matches.join('\n') : '';
  }

  extractFiltered() {
    const domText = this.getDOMFilteredText();
    const filtered = this.applyRegexFilter(domText);
    return filtered || domText;
  }
}

// Global state
let chatPanelOpen = false;
let debugMode = false;
let extractor = null;
let lastFullText = '';
let lastDOMText = '';
let lastOCRText = '';

// Initialize on page load
function initializeExtractor() {
  chrome.storage.sync.get('backseat_currentProfile', async (data) => {
    const profileName = data.backseat_currentProfile || 'Default';
    chrome.runtime.sendMessage(
      { action: 'getProfile' },
      (response) => {
        if (response.success) {
          extractor = new DOMExtractor(response.profile.filters);
          // Pre-extract texts for quick access
          lastFullText = extractor.getFullText();
          lastDOMText = extractor.extractFiltered();
        }
      }
    );
  });
}

// Listen for messages from chat panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'extractDOMText':
        if (!extractor) initializeExtractor();
        lastDOMText = extractor.extractFiltered();
        sendResponse({ success: true, text: lastDOMText });
        break;

      case 'extractFullText':
        if (!extractor) initializeExtractor();
        lastFullText = extractor.getFullText();
        sendResponse({ success: true, text: lastFullText });
        break;

      case 'getDebugInfo':
        if (!extractor) initializeExtractor();
        sendResponse({
          success: true,
          ocrText: lastOCRText,
          domText: lastDOMText,
          fullText: lastFullText,
          profile: request.profile
        });
        break;

      case 'updateOCRText':
        lastOCRText = request.text;
        sendResponse({ success: true });
        break;

      case 'updateProfile':
        extractor = new DOMExtractor(request.profile.filters);
        lastDOMText = extractor.extractFiltered();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
});

// Initialize on script load
initializeExtractor();
