// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  chrome.storage.local.get(['anthropicApiKey'], (result) => {
    if (result.anthropicApiKey) {
      document.getElementById('apiKey').value = result.anthropicApiKey;
    }
  });

  // Save API key
  document.getElementById('saveSettings').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const statusElement = document.getElementById('status');
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      showStatus('Invalid API key format. It should start with "sk-ant-"', 'error');
      return;
    }
    
    chrome.storage.local.set({ anthropicApiKey: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });
});

function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
  
  // Hide status after 3 seconds
  setTimeout(() => {
    statusElement.className = 'status';
  }, 3000);
}