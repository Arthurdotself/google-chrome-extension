// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  
  // Load saved API key
  chrome.storage.local.get(['anthropicApiKey'], (result) => {
    if (result.anthropicApiKey) {
      apiKeyInput.value = result.anthropicApiKey;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      shakeInput(apiKeyInput);
      return;
    }
    
    // New API key format starts with 'sk-ant'
    if (!apiKey.startsWith('sk-ant-') || apiKey.length < 20) {
      showStatus('Invalid API key format. It should start with "sk-ant-"', 'error');
      shakeInput(apiKeyInput);
      return;
    }

    // Animate button
    saveButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      saveButton.style.transform = 'scale(1)';
    }, 100);

    chrome.storage.local.set({ anthropicApiKey: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });
});
function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
  
  // Reset animation by removing and re-adding class
  statusElement.style.animation = 'none';
  statusElement.offsetHeight; // Trigger reflow
  statusElement.style.animation = null;
  
  // Hide status after 3 seconds with fade out
  setTimeout(() => {
    statusElement.style.opacity = '0';
    statusElement.style.transform = 'translateY(-10px)';
    
    // Reset status after fade out
    setTimeout(() => {
      statusElement.className = 'status';
    }, 300);
  }, 3000);
}

function shakeInput(element) {
  element.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
  element.addEventListener('animationend', () => {
    element.style.animation = '';
  }, { once: true });
}