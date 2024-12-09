// background.js

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'makeAnthropicRequest') {
    // Get API key from storage
    chrome.storage.local.get(['anthropicApiKey'], (result) => {
      if (!result.anthropicApiKey) {
        sendResponse({ 
          success: false, 
          error: 'API key not found. Please set it in the extension settings.' 
        });
        return;
      }
      
      const { messages, modelConfig } = request; // Extract modelConfig from the request

      makeAnthropicRequest(messages, result.anthropicApiKey, modelConfig)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true; // Indicates you wish to send a response asynchronously
  }
});

async function makeAnthropicRequest(messages, apiKey, modelConfig = {}) {
  const defaultConfig = {
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1000,
    temperature: 0.3
  };

  // Merge defaultConfig with modelConfig, giving precedence to modelConfig
  const config = { ...defaultConfig, ...modelConfig };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in makeAnthropicRequest:', error);
    throw error;
  }
}

// Function to check if a sync is needed
async function checkAndSync() {
  const now = new Date();
  const result = await chrome.storage.local.get(['lastSync']);
  const lastSync = new Date(result.lastSync || 0);

  // Calculate time difference in hours
  const timeDifference = (now - lastSync) / (1000 * 60 * 60);

  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Last sync time: ${lastSync.toISOString()}`);
  console.log(`Time since last sync: ${timeDifference.toFixed(2)} hours`);

  if (timeDifference > 6) {
    console.log("More than 6 hours since last sync. Triggering sync...");
    performSync(); // Trigger sync and show notification
  } else {
    console.log("No sync needed. Last sync was less than 6 hours ago.");
  }
}


// Function to perform the sync and update the last sync time
// this is just a placeholder function this is dose not have the logic for update the data
async function performSync() {
  console.log("Performing sync...");

  // Your sync logic here
  const now = new Date();

  // Simulate data update process
  // Add your actual data-fetching logic here
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulating delay

  // Update the last sync timestamp
  await chrome.storage.local.set({ lastSync: now.toISOString() });
  console.log(`Sync completed. Updated lastSync to: ${now.toISOString()}`);

}


// Trigger checkAndSync when the browser or extension initializes
chrome.runtime.onStartup.addListener(checkAndSync);
chrome.runtime.onInstalled.addListener(checkAndSync);
