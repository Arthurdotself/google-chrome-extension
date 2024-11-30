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