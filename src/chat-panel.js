// chat-panel.js - UI für Chat-Panel und Debug-Fenster

class ChatPanel {
  constructor() {
    this.isOpen = false;
    this.debugMode = false;
    this.currentProfile = null;
    this.currentOCRText = '';
    this.init();
  }

  async init() {
    // Get current profile
    const response = await chrome.runtime.sendMessage({ action: 'getProfile' });
    if (response.success) {
      this.currentProfile = response.profile;
    }

    // Create panel elements
    this.createPanel();
    this.attachEventListeners();
  }

  createPanel() {
    // Container für Chat-Panel
    const panelContainer = document.createElement('div');
    panelContainer.id = 'backseat-panel-container';
    panelContainer.innerHTML = `
      <div id="backseat-panel">
        <div id="backseat-panel-header">
          <span>Backseat Driver</span>
          <div class="backseat-header-buttons">
            <button id="backseat-debug-toggle" title="Debug-Modus">🐛</button>
            <button id="backseat-collapse-btn" title="Schließen">−</button>
          </div>
        </div>
        <div id="backseat-chat-area">
          <div id="backseat-messages"></div>
          <div id="backseat-input-area">
            <button id="backseat-screenshot-btn" title="Screenshot & OCR">📸</button>
            <input id="backseat-input" type="text" placeholder="Frage stellen...">
            <button id="backseat-send-btn" title="Senden">→</button>
          </div>
        </div>
      </div>
      <div id="backseat-debug-window" style="display: none;">
        <div id="backseat-debug-header">
          Debug Info
          <button id="backseat-debug-close">×</button>
        </div>
        <div id="backseat-debug-content"></div>
      </div>
    `;

    document.body.appendChild(panelContainer);
    this.injectStyles();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #backseat-panel-container {
        all: initial;
        position: fixed;
        bottom: 0;
        right: 0;
        width: 100%;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #backseat-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #ffffff;
        border-top: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        height: 300px;
        box-sizing: border-box;
        font-size: 14px;
        color: #333;
      }

      #backseat-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        background: #f9f9f9;
        font-weight: 600;
        border-radius: 8px 8px 0 0;
      }

      .backseat-header-buttons {
        display: flex;
        gap: 8px;
      }

      .backseat-header-buttons button {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .backseat-header-buttons button:hover {
        background: #e8e8e8;
      }

      #backseat-chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #backseat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .backseat-message {
        padding: 8px 12px;
        border-radius: 6px;
        max-width: 80%;
        word-wrap: break-word;
      }

      .backseat-message.user {
        background: #e3f2fd;
        color: #1565c0;
        align-self: flex-end;
        margin-right: 8px;
      }

      .backseat-message.ai {
        background: #f5f5f5;
        color: #424242;
        align-self: flex-start;
        margin-left: 8px;
      }

      .backseat-message.error {
        background: #ffebee;
        color: #c62828;
        align-self: flex-start;
      }

      #backseat-input-area {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid #e0e0e0;
        background: #fafafa;
      }

      #backseat-input {
        flex: 1;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      #backseat-input:focus {
        border-color: #1976d2;
      }

      #backseat-screenshot-btn,
      #backseat-send-btn {
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }

      #backseat-screenshot-btn:hover,
      #backseat-send-btn:hover {
        background: #1565c0;
      }

      #backseat-debug-window {
        position: fixed;
        bottom: 300px;
        left: 0;
        right: 0;
        background: #1e1e1e;
        color: #d4d4d4;
        border-top: 1px solid #333;
        max-height: 200px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        z-index: 2147483646;
      }

      #backseat-debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #252526;
        border-bottom: 1px solid #333;
        font-size: 12px;
        font-weight: 600;
      }

      #backseat-debug-close {
        background: none;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
      }

      #backseat-debug-close:hover {
        color: #fff;
      }

      #backseat-debug-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
        font-family: "Courier New", monospace;
        font-size: 11px;
        line-height: 1.4;
      }

      .debug-section {
        margin-bottom: 8px;
      }

      .debug-label {
        color: #569cd6;
        font-weight: 600;
      }

      .debug-value {
        color: #ce9178;
        white-space: pre-wrap;
        word-break: break-all;
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    const collapseBtn = document.getElementById('backseat-collapse-btn');
    const screenshotBtn = document.getElementById('backseat-screenshot-btn');
    const sendBtn = document.getElementById('backseat-send-btn');
    const input = document.getElementById('backseat-input');
    const debugToggle = document.getElementById('backseat-debug-toggle');
    const debugClose = document.getElementById('backseat-debug-close');

    collapseBtn.addEventListener('click', () => this.togglePanel());
    screenshotBtn.addEventListener('click', () => this.handleScreenshot());
    sendBtn.addEventListener('click', () => this.handleSendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSendMessage();
    });
    debugToggle.addEventListener('click', () => this.toggleDebugMode());
    debugClose.addEventListener('click', () => this.toggleDebugMode());
  }

  togglePanel() {
    const panel = document.getElementById('backseat-panel');
    this.isOpen = !this.isOpen;
    panel.style.display = this.isOpen ? 'flex' : 'none';
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    const debugWindow = document.getElementById('backseat-debug-window');
    debugWindow.style.display = this.debugMode ? 'flex' : 'none';
    
    if (this.debugMode) {
      this.updateDebugInfo();
    }
  }

  async handleScreenshot() {
    this.addMessage('📸 Erstelle Screenshot...', 'user');
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'screenshotAndOCR' });
      
      if (response.success) {
        this.currentOCRText = response.ocrText;
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateOCRText',
            text: this.currentOCRText
          });
        });
        
        this.addMessage(`✓ OCR abgeschlossen (${response.ocrText.length} Zeichen)`, 'ai');
        
        if (this.debugMode) {
          this.updateDebugInfo();
        }
      } else {
        this.addMessage(`❌ Fehler: ${response.error}`, 'error');
      }
    } catch (error) {
      this.addMessage(`❌ Fehler: ${error.message}`, 'error');
    }
  }

  async handleSendMessage() {
    const input = document.getElementById('backseat-input');
    const question = input.value.trim();
    
    if (!question) return;

    input.value = '';
    this.addMessage(question, 'user');
    this.addMessage('⏳ KI denkt nach...', 'ai');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'askAI',
        ocrText: this.currentOCRText,
        question: question
      });

      if (response.success) {
        // Remove loading message
        const messages = document.getElementById('backseat-messages');
        messages.removeChild(messages.lastChild);
        
        this.addMessage(response.response, 'ai');
        
        if (this.debugMode) {
          this.updateDebugInfo();
        }
      } else {
        this.addMessage(`❌ Fehler: ${response.error}`, 'error');
      }
    } catch (error) {
      this.addMessage(`❌ Fehler: ${error.message}`, 'error');
    }
  }

  async updateDebugInfo() {
    const debugContent = document.getElementById('backseat-debug-content');
    
    if (!this.currentProfile) {
      const response = await chrome.runtime.sendMessage({ action: 'getProfile' });
      if (response.success) {
        this.currentProfile = response.profile;
      }
    }

    // Get DOM and full text
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getDebugInfo',
        profile: this.currentProfile
      }, (response) => {
        if (response.success) {
          let html = `
            <div class="debug-section">
              <span class="debug-label">Profile:</span>
              <span class="debug-value">${this.currentProfile.name}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">Ollama URL:</span>
              <span class="debug-value">${this.currentProfile.ollamaUrl}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">Model:</span>
              <span class="debug-value">${this.currentProfile.model}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">OCR Text Length:</span>
              <span class="debug-value">${this.currentOCRText.length}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">DOM Text Length:</span>
              <span class="debug-value">${response.domText.length}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">Full Text Length:</span>
              <span class="debug-value">${response.fullText.length}</span>
            </div>
            <div class="debug-section">
              <span class="debug-label">OCR Text Preview:</span>
              <span class="debug-value">${this.escapeHtml(this.currentOCRText.substring(0, 200))}</span>
            </div>
          `;
          debugContent.innerHTML = html;
        }
      });
    });
  }

  addMessage(text, type = 'ai') {
    const messagesDiv = document.getElementById('backseat-messages');
    const message = document.createElement('div');
    message.className = `backseat-message ${type}`;
    message.textContent = text;
    messagesDiv.appendChild(message);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chat panel when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ChatPanel();
  });
} else {
  new ChatPanel();
}
