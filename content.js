// content.js
async function createAIHelper() {
  console.log('Facebook Message Extractor initialized');

  // Define processMessages function
  async function processMessages(customerMessage, conversation_history) {
      try {
          // Dynamically import the anthropicService module
          const { generateFullResponse } = await import(chrome.runtime.getURL('anthropicService.js'));
          return await generateFullResponse(customerMessage, conversation_history);
      } catch (error) {
          console.error('Error in processMessages:', error);
          return 'Sorry, I encountered an error processing your message.';
      }
  }

  function extractMessages() {
      const messageSelectors = [
          '.x1y1aw1k.xn6708d.xwib8y2.x1ye3gou',
          '[role="gridcell"] [dir="auto"]',
          '.xzsf02u',
          '.x1slwz57'
      ];

      const timeSelectors = [
          '.x14vqqas.x11i5rnm.xod5an3.xmn8rco span',
          'time',
          '[data-scope="timestamp"]'
      ];

      const extractedMessages = [];
      let currentTimestamp = '';

      timeSelectors.forEach(selector => {
          const timestamps = document.querySelectorAll(selector);
          timestamps.forEach(timestamp => {
              if (timestamp.textContent.includes('202')) {
                  currentTimestamp = timestamp.textContent.trim();
              }
          });
      });

      const filterOutTexts = [
          'More Items', 'Close', 'Insert saved reply', 'Choose your language:',
          'Your message has been received', 'Copy', 'Automations', 'Messaging insights',
          'Available', 'Message settings', 'All messages', 'Messenger', 'Instagram',
          'Facebook comments', 'Instagram comments', 'More', 'Open Dropdown',
          'Reply in Messenger', 'Menu'
      ];

      const isSystemMessage = (text) => {
          if (filterOutTexts.some(filter => text.includes(filter))) return true;
          if (text.match(/^Nov \d+, 202\d, \d+:\d+\s*(?:AM|PM)$/)) return true;
          if (!text.trim()) return true;
          return false;
      };

      messageSelectors.forEach(selector => {
          const containers = document.querySelectorAll(selector);
          containers.forEach(container => {
              const messageText = container.textContent.trim();
              
              if (messageText && !isSystemMessage(messageText)) {
                  const isBot = container.closest('.x13a6bvl') !== null || 
                              container.closest('[data-scope="bot_response"]') !== null;
                  
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

      return extractedMessages.filter((message, index, self) => {
          return index === self.findIndex((m) => m.text === message.text);
      });
  }

  function getConversationData() {
    const messages = extractMessages();
    
    // Find index of our last response
    const lastBotIndex = messages.findIndex(msg => msg.isBot);
    
    // Get all messages after our last response
    const messagesAfterBot = lastBotIndex >= 0 
        ? messages.slice(lastBotIndex + 1).filter(msg => !msg.isBot)
        : messages.filter(msg => !msg.isBot);
    
    // Combine all customer messages after our last response into one string
    const customerMessage = messagesAfterBot
        .map(msg => msg.text)
        .join('\n');
    
    // For conversation history, get the last customer message text up to 100 chars
    const lastCustomerMessage = messagesAfterBot[messagesAfterBot.length - 1]?.text || '';
    const conversation_history = [{
        role: 'user',
        content: lastCustomerMessage.slice(-100),
        timestamp: messagesAfterBot[messagesAfterBot.length - 1]?.timestamp || '',
        sender: messagesAfterBot[messagesAfterBot.length - 1]?.sender || ''
    }];

    console.log('Customer Message (all messages after last bot response):', customerMessage);
    console.log('Conversation History (last customer message up to 100 chars):', conversation_history);

    return {
        conversation_history,
        customerMessage
    };
}

  function writeToChat(message) {
      try {
          const textarea = document.querySelector('textarea[placeholder="Reply in Messenger…"]');
          if (textarea) {
              textarea.value = message;
              const event = new Event('input', {
                  bubbles: true,
                  cancelable: true,
              });
              textarea.dispatchEvent(event);
              textarea.focus();
          }
      } catch (error) {
          console.error('Error writing to chat:', error);
      }
  }

  function createAIButton() {
      const button = document.createElement('button');
      button.className = 'ai-helper-button';
      button.title = 'Get AI Response';
      button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#0084ff"/>
          </svg>
      `;

      button.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const { conversation_history, customerMessage } = getConversationData();
          
          console.log('Conversation History:', conversation_history);
          console.log('Customer Message:', customerMessage);
          
          try {
              writeToChat('Generating response...');
              const response = await processMessages(customerMessage, JSON.stringify(conversation_history));
              writeToChat(response);
          } catch (error) {
              console.error('Error processing message:', error);
              writeToChat('Sorry, I encountered an error processing your message.');
          }
      });

      return button;
  }

  function insertAIHelper() {
      const savedReplyButton = document.querySelector('div[aria-label="Insert saved reply"]');
      if (!savedReplyButton || document.querySelector('.ai-helper-button')) {
          return;
      }

      const aiButton = createAIButton();
      savedReplyButton.parentElement.insertBefore(aiButton, savedReplyButton.nextSibling);
  }

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

  insertAIHelper();

  const observer = new MutationObserver(() => {
      insertAIHelper();
  });

  observer.observe(document.body, {
      childList: true,
      subtree: true
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAIHelper);
} else {
  createAIHelper();
}