// chat-panel.js - Chat-UI & Debug-Panel

(function() {
  let chatPanel = null;
  let debugPanel = null;
  let messagesContainer = null;
  let inputField = null;
  let currentProfile = null;
  let currentOCRText = '';
  let debugMode = false;

  // === Initialization ===
  async function init() {
    // Load current profile
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getProfile' }, resolve);
    });

    if (response.success) {
      currentProfile = response.profile;
    }

    createUIElements();
    attachEventListeners();
  }

  // === UI Creation ===
  function createUIElements() {
    const container = document.createElement('div');
    container.id = 'backseat-container';
    container.setAttribute('style', `
      all: initial;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `);

    const panelHTML = `
      <div id="backseat-panel" style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-top: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        height: 300px;
        box-sizing: border-box;
        font-size: 14px;
        color: #333;
        z-index: 2147483647;
      ">
        <div id="backseat-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          background: #f9f9f9;
          font-weight: 600;
          border-radius: 8px 8px 0 0;
        ">
          <span>Backseat Helper</span>
          <div id="backseat-header-buttons" style="display: flex; gap: 8px;">
            <button id="backseat-debug-toggle" title="Debug-Modus" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 16px;
              padding: 4px 8px;
              border-radius: 4px;
              transition: background 0.2s;
            ">🐛</button>
            <button id="backseat-collapse-btn" title="Schließen" style="
              background: none;
              border: none;
              cursor: pointer;
              font-size: 16px;
              padding: 4px 8px;
              border-radius: 4px;
              transition: background 0.2s;
            ">−</button>
          </div>
        </div>

        <div id="backseat-chat-area" style="
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <div id="backseat-messages" style="
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          "></div>

          <div id="backseat-input-area" style="
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid #e0e0e0;
            background: #fafafa;
          ">
            <button id="backseat-screenshot-btn" title="Screenshot & OCR" style="
              background: #1976d2;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.2s;
            ">📸</button>
            <input id="backseat-input" type="text" placeholder="Frage stellen..." style="
              flex: 1;
              border: 1px solid #d0d0d0;
              border-radius: 6px;
              padding: 8px 12px;
              font-size: 14px;
              outline: none;
              font-family: inherit;
            ">
            <button id="backseat-send-btn" style="
              background: #1976d2;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.2s;
            ">→</button>
          </div>
        </div>
      </div>

      <div id="backseat-debug-window" style="
        position: fixed;
        bottom: 300px;
        left: 0;
        right: 0;
        background: #1e1e1e;
        color: #d4d4d4;
        border-top: 1px solid #333;
        max-height: 200px;
        overflow: hidden;
        display: none;
        flex-direction: column;
        z-index: 2147483646;
      ">
        <div id="backseat-debug-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #252526;
          border-bottom: 1px solid #333;
          font-size: 12px;
          font-weight: 600;
        ">
          Debug Info
          <button id="backseat-debug-close" style="
            background: none;
            border: none;
            color: #d4d4d4;
            cursor: pointer;
            font-size: 16px;
            padding: 0 4px;
          ">×</button>
        </div>
        <div id="backseat-debug-content" style="
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
        "></div>
      </div>
    `;

    container.innerHTML = panelHTML;
    document.body.appendChild(container);

    chatPanel = document.getElementById('backseat-panel');
    debugPanel = document.getElementById('backseat-debug-window');
    messagesContainer = document.getElementById('backseat-messages');
    inputField = document.getElementById('backseat-input');
  }

  // === Event Listeners ===
  function attachEventListeners() {
    document.getElementById('backseat-collapse-btn').addEventListener('click', togglePanel);
    document.getElementById('backseat-screenshot-btn').addEventListener('click', handleScreenshot);
    document.getElementById('backseat-send-btn').addEventListener('click', handleSendMessage);
    document.getElementById('backseat-debug-toggle').addEventListener('click', toggleDebugMode);
    document.getElementById('backseat-debug-close').addEventListener('click', toggleDebugMode);
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });

    // Hover effects
    document.querySelectorAll('#backseat-header-buttons button').forEach(btn => {
      btn.addEventListener('mouseover', (e) => e.target.style.background = '#e8e8e8');
      btn.addEventListener('mouseout', (e) => e.target.style.background = 'none');
    });

    [document.getElementById('backseat-screenshot-btn'), document.getElementById('backseat-send-btn')].forEach(btn => {
      btn.addEventListener('mouseover', (e) => e.target.style.background = '#1565c0');
      btn.addEventListener('mouseout', (e) => e.target.style.background = '#1976d2');
    });
  }

  // === Panel Control ===
  function togglePanel() {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  }

  function toggleDebugMode() {
    debugMode = !debugMode;
    debugPanel.style.display = debugMode ? 'flex' : 'none';
    if (debugMode) updateDebugInfo();
  }

  // === Screenshot & OCR ===
  async function handleScreenshot() {
    addMessage('📸 Erstelle Screenshot...', 'user');
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'screenshotAndOCR' }, resolve);
      });

      if (response.success) {
        currentOCRText = response.ocrText;
        addMessage(`✓ OCR abgeschlossen (${response.ocrText.length} Zeichen)`, 'ai');
        if (debugMode) updateDebugInfo();
      } else {
        addMessage(`❌ Fehler: ${response.error}`, 'error');
      }
    } catch (error) {
      addMessage(`❌ Fehler: ${error.message}`, 'error');
    }
  }

  // === Chat Input ===
  async function handleSendMessage() {
    const question = inputField.value.trim();
    if (!question) return;

    inputField.value = '';
    addMessage(question, 'user');
    addMessage('⏳ KI denkt nach...', 'ai');

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'askAI',
          ocrText: currentOCRText,
          question: question
        }, resolve);
      });

      if (response.success) {
        // Remove loading message
        messagesContainer.removeChild(messagesContainer.lastChild);
        addMessage(response.response, 'ai');
        if (debugMode) updateDebugInfo();
      } else {
        addMessage(`❌ Fehler: ${response.error}`, 'error');
      }
    } catch (error) {
      addMessage(`❌ Fehler: ${error.message}`, 'error');
    }
  }

  // === Debug Info ===
  async function updateDebugInfo() {
    const debugContent = document.getElementById('backseat-debug-content');

    if (!currentProfile) {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getProfile' }, resolve);
      });
      if (response.success) currentProfile = response.profile;
    }

    // Get DOM and full text from content script
    const domResponse = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'getDebugInfo', filters: currentProfile.filters },
            resolve
          );
        }
      });
    });

    let html = '<div style="margin-bottom: 8px;">';
    html += `<span style="color: #569cd6;">Profile:</span> <span style="color: #ce9178;">${escapeHtml(currentProfile.name)}</span><br>`;
    html += `<span style="color: #569cd6;">Ollama URL:</span> <span style="color: #ce9178;">${escapeHtml(currentProfile.ollamaUrl)}</span><br>`;
    html += `<span style="color: #569cd6;">Model:</span> <span style="color: #ce9178;">${escapeHtml(currentProfile.model)}</span><br>`;
    html += `<span style="color: #569cd6;">OCR Text Len:</span> <span style="color: #ce9178;">${currentOCRText.length}</span><br>`;

    if (domResponse && domResponse.success) {
      html += `<span style="color: #569cd6;">DOM Text Len:</span> <span style="color: #ce9178;">${domResponse.filteredDOMText.length}</span><br>`;
      html += `<span style="color: #569cd6;">Full Text Len:</span> <span style="color: #ce9178;">${domResponse.fullText.length}</span><br>`;
    }

    html += `<span style="color: #569cd6;">OCR Preview:</span><br><span style="color: #ce9178; white-space: pre-wrap; word-break: break-all;">${escapeHtml(currentOCRText.substring(0, 300))}</span>`;
    html += '</div>';

    debugContent.innerHTML = html;
  }

  // === Utilities ===
  function addMessage(text, type = 'ai') {
    const msg = document.createElement('div');
    msg.style.cssText = `
      padding: 8px 12px;
      border-radius: 6px;
      max-width: 80%;
      word-wrap: break-word;
      ${type === 'user' ? 'background: #e3f2fd; color: #1565c0; align-self: flex-end; margin-right: 8px;' : ''}
      ${type === 'ai' ? 'background: #f5f5f5; color: #424242; align-self: flex-start; margin-left: 8px;' : ''}
      ${type === 'error' ? 'background: #ffebee; color: #c62828; align-self: flex-start;' : ''}
    `;
    msg.textContent = text;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
