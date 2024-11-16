// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const wooKeyInput = document.getElementById('wooKey');
  const wooSecretInput = document.getElementById('wooSecret');
  
  // Load saved credentials
  chrome.storage.local.get(
    ['anthropicApiKey', 'wooCommerceKey', 'wooCommerceSecret'], 
    (result) => {
      if (result.anthropicApiKey) {
        apiKeyInput.value = result.anthropicApiKey;
      }
      if (result.wooCommerceKey) {
        wooKeyInput.value = result.wooCommerceKey;
      }
      if (result.wooCommerceSecret) {
        wooSecretInput.value = result.wooCommerceSecret;
      }
    }
  );

  // Save credentials
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const wooKey = wooKeyInput.value.trim();
    const wooSecret = wooSecretInput.value.trim();
    
    // Validate Anthropic API Key
    if (!apiKey) {
      showStatus('Please enter an Anthropic API key', 'error');
      shakeInput(apiKeyInput);
      return;
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      showStatus('Invalid Anthropic API key format', 'error');
      shakeInput(apiKeyInput);
      return;
    }

    // Validate WooCommerce credentials
    if (!wooKey || !wooSecret) {
      showStatus('Please enter WooCommerce credentials', 'error');
      if (!wooKey) shakeInput(wooKeyInput);
      if (!wooSecret) shakeInput(wooSecretInput);
      return;
    }

    // Basic length validation for WooCommerce credentials
    if (wooKey.length < 10 || wooSecret.length < 10) {
      showStatus('Invalid WooCommerce credentials format', 'error');
      shakeInput(wooKeyInput);
      shakeInput(wooSecretInput);
      return;
    }

    // Animate button
    saveButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      saveButton.style.transform = 'scale(1)';
    }, 100);

    try {
      // First, save the credentials
      await chrome.storage.local.set({
        anthropicApiKey: apiKey,
        wooCommerceKey: wooKey,
        wooCommerceSecret: wooSecret
      });

      // Then test the WooCommerce connection
      try {
        showStatus('Testing connection...', 'status');

        const response = await testWooCommerceConnection(wooKey, wooSecret);
        console.log('Connection test response:', response);

        if (response.success) {
          showStatus('Settings saved successfully!', 'success');
          console.log('WooCommerce test successful:', response.data);
        } else {
          throw new Error(response.error || 'Connection failed');
        }
      } catch (error) {
        console.error('Connection test error:', error);
        showStatus(`Connection Error: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      showStatus('Error saving settings', 'error');
    }
  });
});

async function testWooCommerceConnection(wooKey, wooSecret) {
  // Create URL with authentication
  const baseUrl = 'https://www.icenter-iraq.com/wp-json/wc/v3/products';
  const url = new URL(baseUrl);
  url.searchParams.append('consumer_key', wooKey);
  url.searchParams.append('consumer_secret', wooSecret);
  url.searchParams.append('per_page', '1'); // Just request one product to test

  try {
    console.log('Testing WooCommerce connection to:', url.toString());
    
    const response = await fetch(url.toString());
    console.log('Connection test status:', response.status);
    
    const text = await response.text();
    console.log('Connection test response:', text);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (e) {
      throw new Error('Invalid JSON response from API');
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
  
  // Reset animation
  statusElement.style.animation = 'none';
  statusElement.offsetHeight; // Trigger reflow
  statusElement.style.animation = null;
  
  // Show status with animation
  statusElement.style.opacity = '1';
  statusElement.style.transform = 'translateY(0)';
  
  // Only hide success messages after delay
  if (type === 'success') {
    setTimeout(() => {
      statusElement.style.opacity = '0';
      statusElement.style.transform = 'translateY(-10px)';
      
      // Reset status after fade out
      setTimeout(() => {
        statusElement.className = 'status';
      }, 300);
    }, 3000);
  }
}

function shakeInput(element) {
  element.classList.add('shake');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake');
  }, { once: true });
}