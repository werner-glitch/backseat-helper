// popup.js - Popup UI logic

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Show current profile
chrome.runtime.sendMessage({ action: 'getProfile' }, (response) => {
  if (response && response.success) {
    const statusDiv = document.getElementById('statusDiv');
    statusDiv.textContent = `Profil: ${response.profile.name}`;
    statusDiv.className = 'status active';
  }
});
