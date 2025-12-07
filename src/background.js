// background.js - Service Worker für KI/OCR/Profil-Logik

class ProfileManager {
  constructor() {
    this.storageKey = 'backseat_profiles';
    this.currentProfileKey = 'backseat_currentProfile';
  }

  async getProfiles() {
    const data = await chrome.storage.sync.get(this.storageKey);
    return data[this.storageKey] || [];
  }

  async getProfile(name) {
    const profiles = await this.getProfiles();
    return profiles.find(p => p.name === name);
  }

  async getCurrentProfile() {
    const data = await chrome.storage.sync.get(this.currentProfileKey);
    const profileName = data[this.currentProfileKey];
    if (!profileName) {
      return this.getDefaultProfile();
    }
    return this.getProfile(profileName);
  }

  async setCurrentProfile(name) {
    await chrome.storage.sync.set({ [this.currentProfileKey]: name });
  }

  async saveProfile(profile) {
    const profiles = await this.getProfiles();
    const index = profiles.findIndex(p => p.name === profile.name);
    
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    
    await chrome.storage.sync.set({ [this.storageKey]: profiles });
  }

  async deleteProfile(name) {
    const profiles = await this.getProfiles();
    const filtered = profiles.filter(p => p.name !== name);
    await chrome.storage.sync.set({ [this.storageKey]: filtered });
  }

  async initializeDefaultProfile() {
    const profiles = await this.getProfiles();
    if (profiles.length === 0) {
      const defaultProfile = {
        name: 'Default',
        ollamaUrl: 'http://localhost:11434',
        model: 'llama2',
        ocrUrl: 'http://localhost:8080/ocr',
        ocrLanguages: ['deu', 'eng'],
        prompt: 'Du bist ein hilfreicher Assistent. Antworte präzise und kurz.',
        filters: {
          regex: '',
          domInclude: [],
          domExclude: []
        }
      };
      await this.saveProfile(defaultProfile);
      await this.setCurrentProfile('Default');
    }
  }

  getDefaultProfile() {
    return {
      name: 'Default',
      ollamaUrl: 'http://localhost:11434',
      model: 'llama2',
      ocrUrl: 'http://localhost:8080/ocr',
      ocrLanguages: ['deu', 'eng'],
      prompt: 'Du bist ein hilfreicher Assistent. Antworte präzise und kurz.',
      filters: {
        regex: '',
        domInclude: [],
        domExclude: []
      }
    };
  }

  async exportProfiles() {
    const profiles = await this.getProfiles();
    return JSON.stringify(profiles, null, 2);
  }

  async importProfiles(jsonString) {
    const profiles = JSON.parse(jsonString);
    if (!Array.isArray(profiles)) {
      throw new Error('Invalid profile format');
    }
    await chrome.storage.sync.set({ [this.storageKey]: profiles });
  }
}

class PromptBuilder {
  constructor(profile) {
    this.profile = profile;
  }

  build(ocrText, userQuestion = '') {
    const parts = [
      `System: ${this.profile.prompt}`,
      `Content:\n${ocrText}`
    ];

    if (userQuestion) {
      parts.push(`User question: ${userQuestion}`);
    }

    return parts.join('\n\n');
  }
}

class OllamaClient {
  constructor(ollamaUrl, model) {
    this.url = ollamaUrl;
    this.model = model;
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Ollama error: ${error.message}`);
    }
  }
}

class OCRClient {
  constructor(ocrUrl) {
    this.url = ocrUrl;
  }

  async process(imageBase64, languages = ['deu', 'eng']) {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageBase64,
          languages: languages.join(',')
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      throw new Error(`OCR error: ${error.message}`);
    }
  }
}

// Globale Instanzen
const profileManager = new ProfileManager();
let currentProfile = null;

// Initialisierung
chrome.runtime.onInstalled.addListener(async () => {
  await profileManager.initializeDefaultProfile();
  currentProfile = await profileManager.getCurrentProfile();
});

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getProfile':
          currentProfile = await profileManager.getCurrentProfile();
          sendResponse({ success: true, profile: currentProfile });
          break;

        case 'setProfile':
          await profileManager.setCurrentProfile(request.profileName);
          currentProfile = await profileManager.getCurrentProfile();
          sendResponse({ success: true, profile: currentProfile });
          break;

        case 'getProfiles':
          const profiles = await profileManager.getProfiles();
          sendResponse({ success: true, profiles });
          break;

        case 'saveProfile':
          await profileManager.saveProfile(request.profile);
          sendResponse({ success: true });
          break;

        case 'deleteProfile':
          await profileManager.deleteProfile(request.profileName);
          sendResponse({ success: true });
          break;

        case 'exportProfiles':
          const exported = await profileManager.exportProfiles();
          sendResponse({ success: true, data: exported });
          break;

        case 'importProfiles':
          await profileManager.importProfiles(request.data);
          sendResponse({ success: true });
          break;

        case 'screenshotAndOCR':
          {
            if (!currentProfile) {
              currentProfile = await profileManager.getCurrentProfile();
            }
            const imageData = await chrome.tabs.captureVisibleTab();
            const ocrClient = new OCRClient(currentProfile.ocrUrl);
            const ocrText = await ocrClient.process(imageData, currentProfile.ocrLanguages);
            sendResponse({ success: true, ocrText, imageData });
          }
          break;

        case 'askAI':
          {
            if (!currentProfile) {
              currentProfile = await profileManager.getCurrentProfile();
            }
            const promptBuilder = new PromptBuilder(currentProfile);
            const fullPrompt = promptBuilder.build(request.ocrText, request.question);
            const ollamaClient = new OllamaClient(currentProfile.ollamaUrl, currentProfile.model);
            const aiResponse = await ollamaClient.generate(fullPrompt);
            sendResponse({ success: true, response: aiResponse });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep the message channel open for async response
});
