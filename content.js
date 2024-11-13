function createAIHelper() {
  console.log('Facebook Message Extractor initialized');

  function createAIButton() {
    const button = document.createElement('button');
    button.className = 'ai-helper-button';
    button.setAttribute('title', 'Extract Messages');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#0084ff"/>
      </svg>
    `;
    return button;
  }

  // In the extractMessages function, update the filtering logic:

function extractMessages() {
  // Message container selectors used by Facebook
  const messageSelectors = [
    '.x1y1aw1k.xn6708d.xwib8y2.x1ye3gou', // Primary message container
    '[role="gridcell"] [dir="auto"]',      // Alternative message container
    '.xzsf02u',                            // Message text container
    '.x1slwz57'                            // Another message variant
  ];

  // Time stamp selectors
  const timeSelectors = [
    '.x14vqqas.x11i5rnm.xod5an3.xmn8rco span',
    'time',
    '[data-scope="timestamp"]'
  ];

  const extractedMessages = [];
  let currentTimestamp = '';

  // Extract timestamps
  timeSelectors.forEach(selector => {
    const timestamps = document.querySelectorAll(selector);
    timestamps.forEach(timestamp => {
      if (timestamp.textContent.includes('202')) { // Only get full timestamps
        currentTimestamp = timestamp.textContent.trim();
      }
    });
  });

  // List of text to filter out
  const filterOutTexts = [
    'More Items',
    'Close',
    'Insert saved reply',
    'Choose your language:',
    'Your message has been received',
    'Copy'
  ];

  // Extract messages using multiple selectors
  messageSelectors.forEach(selector => {
    const containers = document.querySelectorAll(selector);
    containers.forEach(container => {
      const messageText = container.textContent.trim();
      
      // Check if the message should be included
      const shouldInclude = messageText && 
                          messageText.length > 0 &&
                          !filterOutTexts.some(filterText => 
                            messageText.includes(filterText)) &&
                          !messageText.match(/^Nov \d+, 202\d, \d+:\d+\s*(?:AM|PM)$/); // Exclude timestamp-only messages
      
      if (shouldInclude) {
        // Determine if it's a bot message
        const isBot = container.closest('.x13a6bvl') !== null || 
                     container.closest('[data-scope="bot_response"]') !== null;
        
        // Get the sender name if available
        let sender = '';
        const senderElement = container.closest('.xuk3077')?.querySelector('[data-scope="first_name"]') || 
                             container.closest('.xuk3077')?.querySelector('.xzsf02u');
        if (senderElement) {
          sender = senderElement.textContent.trim();
        }

        extractedMessages.push({
          text: messageText,
          isBot: isBot,
          timestamp: currentTimestamp,
          sender: sender
        });
      }
    });
  });

  // Remove duplicates and filter out system messages
  return extractedMessages.filter((message, index, self) =>
    index === self.findIndex((m) => m.text === message.text) && 
    !message.text.includes('Copy') &&
    !message.text.match(/^Nov \d+, 202\d, \d+:\d+\s*(?:AM|PM)$/)
  );
}

  function createMessagePopup(messages) {
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'message-extractor-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 600px;
      max-height: 80vh;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    `;

    // Create header with title and close button
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 style="margin: 0;">Messages (${messages.length})</h2>
        <button style="border: none; background: none; font-size: 24px; cursor: pointer;" onclick="this.parentElement.parentElement.parentElement.remove();document.getElementById('extractor-overlay').remove()">×</button>
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <button id="copy-all" style="padding: 8px 16px; background: #0084ff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy All</button>
        <button id="download-all" style="padding: 8px 16px; background: #0084ff; color: white; border: none; border-radius: 4px; cursor: pointer;">Download</button>
      </div>
    `;
    popup.appendChild(header);

    // Add messages
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

    messages.forEach(message => {
      const messageEl = document.createElement('div');
      messageEl.style.cssText = `
        padding: 10px;
        border-radius: 4px;
        background: ${message.isBot ? '#f0f7ff' : '#f5f5f5'};
        border: 1px solid ${message.isBot ? '#e1f0ff' : '#eee'};
      `;

      messageEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; color: #666;">
          <span>${message.timestamp}${message.sender ? ' • ' + message.sender : ''}</span>
          <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent);this.textContent='Copied!';setTimeout(() => this.textContent='Copy', 2000)" 
                  style="border: none; background: none; color: #0084ff; cursor: pointer; font-size: 12px;">Copy</button>
        </div>
        <div style="color: ${message.isBot ? '#0055a5' : '#333'}">${message.text}</div>
      `;

      messageContainer.appendChild(messageEl);
    });

    popup.appendChild(messageContainer);

    // Add event listeners for copy and download buttons
    popup.querySelector('#copy-all').addEventListener('click', () => {
      const text = messages.map(msg => 
        `[${msg.timestamp}] ${msg.sender ? msg.sender + ': ' : ''}${msg.text}`
      ).join('\n');
      navigator.clipboard.writeText(text);
      popup.querySelector('#copy-all').textContent = 'Copied!';
      setTimeout(() => popup.querySelector('#copy-all').textContent = 'Copy All', 2000);
    });

    popup.querySelector('#download-all').addEventListener('click', () => {
      const text = messages.map(msg => 
        `[${msg.timestamp}] ${msg.sender ? msg.sender + ': ' : ''}${msg.text}`
      ).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'facebook-messages.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'extractor-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
    `;
    overlay.onclick = () => {
      popup.remove();
      overlay.remove();
    };

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }

  function insertAIHelper() {
    // Find the "Insert saved reply" button
    const savedReplyButton = document.querySelector('div[aria-label="Insert saved reply"][role="button"]');
    if (!savedReplyButton || document.querySelector('.ai-helper-button')) {
      return;
    }

    // Create and insert the button
    const extractorButton = createAIButton();
    savedReplyButton.parentElement.insertBefore(extractorButton, savedReplyButton.nextSibling);

    // Handle button click
    extractorButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Extracting messages...');
      
      const messages = extractMessages();
      createMessagePopup(messages);
    });
  }

  // Add custom styles
  const style = document.createElement('style');
  style.textContent = `
    .ai-helper-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }
    .ai-helper-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  `;
  document.head.appendChild(style);

  // Initial attempt to insert the button
  insertAIHelper();

  // Watch for DOM changes to dynamically reinsert the button
  const observer = new MutationObserver(() => {
    insertAIHelper();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize the extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAIHelper);
} else {
  createAIHelper();
}