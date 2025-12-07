// background.js - Service Worker: Profile, OCR, KI, Datenmanagement

const STORAGE_KEY = 'backseat_profiles';
const CURRENT_PROFILE_KEY = 'backseat_currentProfile';

// === Profile Manager ===
async function getAllProfiles() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function getProfile(name) {
  const profiles = await getAllProfiles();
  return profiles.find(p => p.name === name);
}

async function getCurrentProfile() {
  const result = await chrome.storage.sync.get(CURRENT_PROFILE_KEY);
  const profileName = result[CURRENT_PROFILE_KEY];
  if (!profileName) {
    return getDefaultProfile();
  }
  return getProfile(profileName);
}

async function setCurrentProfile(name) {
  await chrome.storage.sync.set({ [CURRENT_PROFILE_KEY]: name });
}

async function saveProfile(profile) {
  const profiles = await getAllProfiles();
  const index = profiles.findIndex(p => p.name === profile.name);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await chrome.storage.sync.set({ [STORAGE_KEY]: profiles });
}

async function deleteProfile(name) {
  const profiles = await getAllProfiles();
  const filtered = profiles.filter(p => p.name !== name);
  await chrome.storage.sync.set({ [STORAGE_KEY]: filtered });
}

function getDefaultProfile() {
  return {
    name: 'Default',
    ollamaUrl: 'http://localhost:11434',
    model: 'llama3',
    ocrUrl: 'http://localhost:8884/tesseract',
    ocrLanguages: ['deu', 'eng'],
    prompt: 'Du bist ein kritischer, neugieriger Begleiter. Stelle Fragen, stelle Annahmen infrage und biete neue Perspektiven.',
    filters: {
      regex: '',
      domInclude: [],
      domExclude: []
    }
  };
}

async function initializeDefaultProfile() {
  const profiles = await getAllProfiles();
  if (profiles.length === 0) {
    await saveProfile(getDefaultProfile());
    await setCurrentProfile('Default');
  }
}

async function exportProfiles() {
  const profiles = await getAllProfiles();
  return JSON.stringify(profiles, null, 2);
}

async function importProfiles(jsonString) {
  const profiles = JSON.parse(jsonString);
  if (!Array.isArray(profiles)) {
    throw new Error('Invalid profile format: expected array');
  }
  await chrome.storage.sync.set({ [STORAGE_KEY]: profiles });
}

// === OCR Client ===
async function processOCR(imageDataUrl, ocrUrl, languages) {
  // Konvertiere DataURL zu Blob für Multipart-Upload
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  
  const formData = new FormData();
  formData.append('file', blob, 'screenshot.png');
  if (languages && languages.length > 0) {
    formData.append('languages', languages.join(','));
  }
  
  try {
    const ocrResponse = await fetch(ocrUrl, {
      method: 'POST',
      body: formData,
      timeout: 30000
    });
    
    if (!ocrResponse.ok) {
      throw new Error(`OCR HTTP ${ocrResponse.status}`);
    }
    
    const result = await ocrResponse.json();
    return result.text || result.stdout || '';
  } catch (error) {
    throw new Error(`OCR error: ${error.message}`);
  }
}

// === KI Client ===
async function askOllama(ollamaUrl, model, prompt) {
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.response || '';
  } catch (error) {
    throw new Error(`Ollama error: ${error.message}`);
  }
}

// === Prompt Builder ===
function buildPrompt(systemPrompt, ocrText, userQuestion) {
  const parts = [
    `System: ${systemPrompt}`,
    `Content:\n${ocrText}`
  ];
  
  if (userQuestion && userQuestion.trim()) {
    parts.push(`User question: ${userQuestion}`);
  }
  
  return parts.join('\n\n');
}

// === Initialization ===
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultProfile();
});

// === Message Handler ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getProfile': {
          const profile = await getCurrentProfile();
          sendResponse({ success: true, profile });
          break;
        }

        case 'setProfile': {
          await setCurrentProfile(request.profileName);
          const profile = await getCurrentProfile();
          sendResponse({ success: true, profile });
          break;
        }

        case 'getAllProfiles': {
          const profiles = await getAllProfiles();
          sendResponse({ success: true, profiles });
          break;
        }

        case 'saveProfile': {
          await saveProfile(request.profile);
          sendResponse({ success: true });
          break;
        }

        case 'deleteProfile': {
          await deleteProfile(request.profileName);
          sendResponse({ success: true });
          break;
        }

        case 'exportProfiles': {
          const data = await exportProfiles();
          sendResponse({ success: true, data });
          break;
        }

        case 'importProfiles': {
          await importProfiles(request.data);
          sendResponse({ success: true });
          break;
        }

        case 'screenshotAndOCR': {
          const profile = await getCurrentProfile();
          const imageDataUrl = await chrome.tabs.captureVisibleTab();
          const ocrText = await processOCR(imageDataUrl, profile.ocrUrl, profile.ocrLanguages);
          sendResponse({ success: true, ocrText });
          break;
        }

        case 'askAI': {
          const profile = await getCurrentProfile();
          const prompt = buildPrompt(profile.prompt, request.ocrText, request.question);
          const response = await askOllama(profile.ollamaUrl, profile.model, prompt);
          sendResponse({ success: true, response, prompt });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});
