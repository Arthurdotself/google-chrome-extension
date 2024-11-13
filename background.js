// background.js
const ANTHROPIC_API_KEY = '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';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'makeAnthropicRequest') {
    makeAnthropicRequest(request.messages)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function makeAnthropicRequest(messages) {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true' // Add this header
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0.3,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', data); // Debug log
    return data;
  } catch (error) {
    console.error('Error in makeAnthropicRequest:', error);
    throw error;
  }
}