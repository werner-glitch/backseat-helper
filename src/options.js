// options.js - Profilverwaltung UI

class OptionsUI {
  constructor() {
    this.editingProfile = null;
    this.init();
  }

  async init() {
    this.loadProfiles();
    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('newProfileBtn').addEventListener('click', () => this.showNewProfileForm());
    document.getElementById('exportBtn').addEventListener('click', () => this.handleExport());
    document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
    document.getElementById('saveProfileBtn').addEventListener('click', () => this.handleSaveProfile());
    document.getElementById('cancelProfileBtn').addEventListener('click', () => this.hideForm());
    document.getElementById('confirmImportBtn').addEventListener('click', () => this.handleImport());
    document.getElementById('cancelImportBtn').addEventListener('click', () => this.hideImportModal());
  }

  async loadProfiles() {
    const response = await this.sendMessage({ action: 'getAllProfiles' });
    if (!response.success) {
      this.showStatus('Fehler beim Laden der Profile', 'error');
      return;
    }

    const currentResponse = await this.sendMessage({ action: 'getProfile' });
    const currentProfileName = currentResponse.profile?.name;

    const profileList = document.getElementById('profileList');
    profileList.innerHTML = '';

    response.profiles.forEach(profile => {
      const item = document.createElement('li');
      item.className = `profile-item ${profile.name === currentProfileName ? 'active' : ''}`;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'profile-name';
      nameSpan.textContent = profile.name;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'profile-actions';

      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn-secondary';
      selectBtn.textContent = 'Wählen';
      selectBtn.addEventListener('click', () => this.selectProfile(profile.name));

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.textContent = 'Bearbeiten';
      editBtn.addEventListener('click', () => this.showEditProfileForm(profile));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.textContent = 'Löschen';
      deleteBtn.addEventListener('click', () => this.handleDeleteProfile(profile.name));

      actionsDiv.appendChild(selectBtn);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      item.appendChild(nameSpan);
      item.appendChild(actionsDiv);
      profileList.appendChild(item);
    });
  }

  showNewProfileForm() {
    this.editingProfile = null;
    this.clearForm();
    document.getElementById('profileForm').classList.add('show');
    document.getElementById('profileName').focus();
  }

  showEditProfileForm(profile) {
    this.editingProfile = profile;
    document.getElementById('profileName').value = profile.name;
    document.getElementById('ollamaUrl').value = profile.ollamaUrl;
    document.getElementById('model').value = profile.model;
    document.getElementById('ocrUrl').value = profile.ocrUrl;
    document.getElementById('ocrLanguages').value = profile.ocrLanguages.join(',');
    document.getElementById('prompt').value = profile.prompt;
    document.getElementById('regexFilter').value = profile.filters.regex;
    document.getElementById('domInclude').value = profile.filters.domInclude.join('\n');
    document.getElementById('domExclude').value = profile.filters.domExclude.join('\n');
    document.getElementById('profileForm').classList.add('show');
    document.getElementById('profileName').focus();
  }

  hideForm() {
    document.getElementById('profileForm').classList.remove('show');
    this.editingProfile = null;
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

  async handleSaveProfile() {
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
      ocrLanguages: document.getElementById('ocrLanguages').value.split(',').map(s => s.trim()).filter(s => s),
      prompt: document.getElementById('prompt').value.trim(),
      filters: {
        regex: document.getElementById('regexFilter').value.trim(),
        domInclude: document.getElementById('domInclude').value.split('\n').map(s => s.trim()).filter(s => s),
        domExclude: document.getElementById('domExclude').value.split('\n').map(s => s.trim()).filter(s => s)
      }
    };

    if (!profile.ollamaUrl || !profile.model) {
      this.showStatus('Ollama URL und Modell sind erforderlich', 'error');
      return;
    }

    const response = await this.sendMessage({ action: 'saveProfile', profile });
    if (response.success) {
      this.showStatus(`Profil "${name}" gespeichert`, 'success');
      this.hideForm();
      this.loadProfiles();
    } else {
      this.showStatus('Fehler beim Speichern', 'error');
    }
  }

  async selectProfile(name) {
    const response = await this.sendMessage({ action: 'setProfile', profileName: name });
    if (response.success) {
      this.showStatus(`Profil "${name}" ausgewählt`, 'success');
      this.loadProfiles();
    } else {
      this.showStatus('Fehler beim Auswählen', 'error');
    }
  }

  async handleDeleteProfile(name) {
    if (!confirm(`Profil "${name}" wirklich löschen?`)) {
      return;
    }

    const response = await this.sendMessage({ action: 'deleteProfile', profileName: name });
    if (response.success) {
      this.showStatus(`Profil "${name}" gelöscht`, 'success');
      this.loadProfiles();
    } else {
      this.showStatus('Fehler beim Löschen', 'error');
    }
  }

  async handleExport() {
    const response = await this.sendMessage({ action: 'exportProfiles' });
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
  }

  showImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('importText').value = '';
    document.getElementById('importText').focus();
  }

  hideImportModal() {
    document.getElementById('importModal').classList.remove('show');
  }

  async handleImport() {
    const json = document.getElementById('importText').value.trim();
    if (!json) {
      this.showStatus('JSON erforderlich', 'error');
      return;
    }

    const response = await this.sendMessage({ action: 'importProfiles', data: json });
    if (response.success) {
      this.showStatus('Profile importiert', 'success');
      this.hideImportModal();
      this.loadProfiles();
    } else {
      this.showStatus(`Fehler: ${response.error}`, 'error');
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 4000);
  }

  sendMessage(request) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(request, resolve);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OptionsUI();
  });
} else {
  new OptionsUI();
}
