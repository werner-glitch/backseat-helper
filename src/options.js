// options.js - Profilverwaltung UI

class OptionsManager {
  constructor() {
    this.currentEditingProfile = null;
    this.init();
  }

  async init() {
    this.loadProfiles();
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('newProfileBtn').addEventListener('click', () => this.newProfile());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportProfiles());
    document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
    document.getElementById('saveProfileBtn').addEventListener('click', () => this.saveProfile());
    document.getElementById('cancelProfileBtn').addEventListener('click', () => this.hideForm());
    document.getElementById('confirmImportBtn').addEventListener('click', () => this.importProfiles());
    document.getElementById('cancelImportBtn').addEventListener('click', () => this.hideImportModal());
  }

  async loadProfiles() {
    const response = await chrome.runtime.sendMessage({ action: 'getProfiles' });
    if (!response.success) {
      this.showStatus('Fehler beim Laden der Profile', 'error');
      return;
    }

    const currentResponse = await chrome.runtime.sendMessage({ action: 'getProfile' });
    const currentProfileName = currentResponse.profile?.name;

    const profileList = document.getElementById('profileList');
    profileList.innerHTML = '';

    response.profiles.forEach(profile => {
      const item = document.createElement('li');
      item.className = `profile-item ${profile.name === currentProfileName ? 'active' : ''}`;
      item.innerHTML = `
        <span class="profile-name">${this.escapeHtml(profile.name)}</span>
        <div class="profile-actions">
          <button class="btn-secondary" data-action="select" data-name="${this.escapeHtml(profile.name)}">Wählen</button>
          <button class="btn-secondary" data-action="edit" data-name="${this.escapeHtml(profile.name)}">Bearbeiten</button>
          <button class="btn-danger" data-action="delete" data-name="${this.escapeHtml(profile.name)}">Löschen</button>
        </div>
      `;

      item.querySelector('[data-action="select"]').addEventListener('click', () => this.selectProfile(profile.name));
      item.querySelector('[data-action="edit"]').addEventListener('click', () => this.editProfile(profile));
      item.querySelector('[data-action="delete"]').addEventListener('click', () => this.deleteProfile(profile.name));

      profileList.appendChild(item);
    });
  }

  newProfile() {
    this.currentEditingProfile = null;
    this.clearForm();
    document.getElementById('profileForm').style.display = 'block';
    document.getElementById('profileName').focus();
  }

  async editProfile(profile) {
    this.currentEditingProfile = profile;
    document.getElementById('profileName').value = profile.name;
    document.getElementById('ollamaUrl').value = profile.ollamaUrl;
    document.getElementById('model').value = profile.model;
    document.getElementById('ocrUrl').value = profile.ocrUrl;
    document.getElementById('ocrLanguages').value = profile.ocrLanguages.join(',');
    document.getElementById('prompt').value = profile.prompt;
    document.getElementById('regexFilter').value = profile.filters.regex;
    document.getElementById('domInclude').value = profile.filters.domInclude.join('\n');
    document.getElementById('domExclude').value = profile.filters.domExclude.join('\n');
    document.getElementById('profileForm').style.display = 'block';
    document.getElementById('profileName').focus();
  }

  async saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    if (!name) {
      this.showStatus('Profilname erforderlich', 'error');
      return;
    }

    const profile = {
      name: name,
      ollamaUrl: document.getElementById('ollamaUrl').value.trim(),
      model: document.getElementById('model').value.trim(),
      ocrUrl: document.getElementById('ocrUrl').value.trim(),
      ocrLanguages: document.getElementById('ocrLanguages').value.split(',').map(l => l.trim()).filter(l => l),
      prompt: document.getElementById('prompt').value.trim(),
      filters: {
        regex: document.getElementById('regexFilter').value.trim(),
        domInclude: document.getElementById('domInclude').value.split('\n').map(s => s.trim()).filter(s => s),
        domExclude: document.getElementById('domExclude').value.split('\n').map(s => s.trim()).filter(s => s)
      }
    };

    // Validate inputs
    if (!profile.ollamaUrl || !profile.model) {
      this.showStatus('Ollama URL und Modell sind erforderlich', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveProfile',
        profile: profile
      });

      if (response.success) {
        this.showStatus(`Profil "${name}" gespeichert`, 'success');
        this.hideForm();
        this.loadProfiles();
      } else {
        this.showStatus('Fehler beim Speichern', 'error');
      }
    } catch (error) {
      this.showStatus(`Fehler: ${error.message}`, 'error');
    }
  }

  async deleteProfile(name) {
    if (!confirm(`Profil "${name}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteProfile',
        profileName: name
      });

      if (response.success) {
        this.showStatus(`Profil "${name}" gelöscht`, 'success');
        this.loadProfiles();
      } else {
        this.showStatus('Fehler beim Löschen', 'error');
      }
    } catch (error) {
      this.showStatus(`Fehler: ${error.message}`, 'error');
    }
  }

  async selectProfile(name) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setProfile',
        profileName: name
      });

      if (response.success) {
        this.showStatus(`Profil "${name}" ausgewählt`, 'success');
        this.loadProfiles();
      } else {
        this.showStatus('Fehler beim Auswählen', 'error');
      }
    } catch (error) {
      this.showStatus(`Fehler: ${error.message}`, 'error');
    }
  }

  async exportProfiles() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'exportProfiles' });

      if (response.success) {
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backseat-profiles-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showStatus('Profile exportiert', 'success');
      } else {
        this.showStatus('Fehler beim Export', 'error');
      }
    } catch (error) {
      this.showStatus(`Fehler: ${error.message}`, 'error');
    }
  }

  showImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('importText').value = '';
    document.getElementById('importText').focus();
  }

  hideImportModal() {
    document.getElementById('importModal').classList.remove('show');
  }

  async importProfiles() {
    const json = document.getElementById('importText').value.trim();
    
    if (!json) {
      this.showStatus('JSON erforderlich', 'error');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'importProfiles',
        data: json
      });

      if (response.success) {
        this.showStatus('Profile importiert', 'success');
        this.hideImportModal();
        this.loadProfiles();
      } else {
        this.showStatus('Fehler beim Import', 'error');
      }
    } catch (error) {
      this.showStatus(`Fehler: ${error.message}`, 'error');
    }
  }

  hideForm() {
    document.getElementById('profileForm').style.display = 'none';
    this.currentEditingProfile = null;
  }

  clearForm() {
    document.getElementById('profileName').value = '';
    document.getElementById('ollamaUrl').value = '';
    document.getElementById('model').value = '';
    document.getElementById('ocrUrl').value = '';
    document.getElementById('ocrLanguages').value = '';
    document.getElementById('prompt').value = '';
    document.getElementById('regexFilter').value = '';
    document.getElementById('domInclude').value = '';
    document.getElementById('domExclude').value = '';
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 4000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
