// content.js
async function createAIHelper() {
  console.log('Facebook Message Extractor initialized');

    // Define processMessages function
    async function processMessages(customerMessage, conversation_history ,customerName ) {
        try {
            // Dynamically import the anthropicService module
            const { generateFullResponse, identifyProductInMessage } = await import(chrome.runtime.getURL('anthropicService.js'));
            
            // First identify products in the message
            const productInfo = await identifyProductInMessage(customerMessage, conversation_history);
            console.log('Product identification results:', productInfo);
            
            // Initialize productDataString
            let productDataString = '';
            
            // If products were identified and need more info, format the product data
            if (productInfo && productInfo.needsInfoToAnswer && productInfo.productsData) {
                // Format product data for inclusion in the prompt
                productDataString = JSON.stringify(productInfo.productsData, null, 2);
                console.log('Formatted product data:', productDataString);
            }
            
            // Then generate the full response with the enhanced context
            // Pass product data string as the third parameter
            return await generateFullResponse(
                customerMessage, 
                conversation_history,
                productDataString,
                customerName
            );
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
    
        const filterOutTexts = [
            'More Items', 'Close', 'Insert saved reply', 'Choose your language:',
            'Your message has been received', 'Copy', 'Automations', 'Messaging insights',
            'Available', 'Message settings', 'All messages', 'Messenger', 'Instagram',
            'Facebook comments', 'Instagram comments', 'More', 'Open Dropdown',
            'Reply in Messenger', 'Menu', 'WhatsAppWhatsAppWhatsAppNewNew', 'placeholder',
            'WhatsApp','www.icenter-iraq.com','الإلكتروني في إستراحة حاليًا، ولكنه في خدمتكم من'
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
    
                    // Extract the timestamp for each message
                    let timestamp = '';
                    timeSelectors.forEach(timeSelector => {
                        const timeElement = container.querySelector(timeSelector) ||
                                            container.closest('.some-time-container')?.querySelector(timeSelector);
                        if (timeElement) {
                            timestamp = timeElement.textContent.trim();
                        }
                    });
    
                    extractedMessages.push({
                        text: messageText,
                        isBot: isBot,
                        timestamp: timestamp,
                        sender: sender
                    });
                }
            });
        });
    
        // Remove duplicates based on text and timestamp
        return extractedMessages.filter((message, index, self) => {
            return index === self.findIndex((m) => m.text === message.text && m.timestamp === message.timestamp);
        });
    }
    
    
    
  function extractCustomerName() {
    try {
        // Look for the header wrapper first
        const headerWrapper = document.querySelector('[data-pagelet="BizInboxDetailViewHeaderSectionWrapper"]');
        if (!headerWrapper) return 'Customer';

        // Look for the profile section which typically contains the name
        // We'll use multiple approaches to find the name element
        
        // Approach 1: Look for text near the profile image
        const profileSection = headerWrapper.querySelector('img.img')?.closest('div.x78zum5');
        if (profileSection) {
            // Navigate to the adjacent text container
            const nameContainer = profileSection.nextElementSibling?.querySelector('div[style*="-webkit-line-clamp: 1"]');
            if (nameContainer?.textContent) {
                return cleanName(nameContainer.textContent);
            }
        }

        // Approach 2: Look for elements with specific styling that typically contains the name
        const styledNameElement = headerWrapper.querySelector('div[style*="-webkit-line-clamp: 1"]');
        if (styledNameElement?.textContent) {
            return cleanName(styledNameElement.textContent);
        }

        // Approach 3: Look for elements near the "Assign this conversation" link
        const assignLink = headerWrapper.querySelector('a[role="button"]');
        if (assignLink) {
            const nameElement = assignLink.closest('div.x78zum5')?.previousElementSibling;
            if (nameElement?.textContent) {
                return cleanName(nameElement.textContent);
            }
        }

        // Default fallback
        return 'Customer';
    } catch (error) {
        console.error('Error extracting customer name:', error);
        return 'Customer';
    }
}

function cleanName(name) {
    if (!name) return 'Customer';
    
    // Remove common UI text elements
    const uiTexts = [
        'Assign this conversation',
        'Open Dropdown',
        'Menu',
        'More',
        'Available',
        'Unavailable',
        'Active',
        'Inactive'
    ];
    
    let cleanedName = name.trim();
    
    // Remove UI texts
    uiTexts.forEach(text => {
        cleanedName = cleanedName.replace(text, '').trim();
    });
    
    // Basic validation
    if (cleanedName.length < 2 || cleanedName.length > 50) {
        return 'Customer';
    }
    
    // Remove any extra whitespace
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    
    // Final check for valid name (contains at least one letter)
    if (!/[a-zA-Z]/.test(cleanedName)) {
        return 'Customer';
    }
    
    return cleanedName;
}


function getConversationData() {
    const messages = extractMessages(); // Get all messages, including bot messages

    // Get customer name using our robust extractor
    const customerName = extractCustomerName();

    // Initialize variables to build conversation_history and customerMessage
    let conversation_history = '';
    let customerMessage = '';

    // Determine the index of the last bot message
    let lastBotIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].isBot) {
            lastBotIndex = i;
            break;
        }
    }

    // Build conversation_history and customerMessage
    messages.forEach((msg, index) => {
        if (!msg.isBot) {
            // Message is from the customer
            if (lastBotIndex !== -1 && index < lastBotIndex) {
                // Message is before the last bot message, so it's answered
                conversation_history += msg.text + '\n';
            } else if (index > lastBotIndex || lastBotIndex === -1) {
                // Message is after the last bot message or no bot messages have been sent
                // So it's pending and added to customerMessage
                customerMessage += msg.text + '\n';
            }
        }
        // Bot messages are excluded entirely
    });

    // Remove trailing newlines
    conversation_history = conversation_history.trim();
    customerMessage = customerMessage.trim();

    return {
        conversation_history,
        customerMessage,
        customerName
    };
}






function writeToChat(message) {
    try {
        const textarea = document.querySelector('textarea[placeholder="Reply in Messenger…"], textarea[placeholder="Reply on Instagram…"]');
        if (textarea) {
            const chatContainer = textarea.closest('.x78zum5');
            
            // Add glow effect when generating response
            if (message === 'Generating response...') {
                chatContainer?.classList.add('ai-writing');
            } else {
                chatContainer?.classList.remove('ai-writing');
            }
            
            // Detect if the message contains Arabic characters
            const isArabic = /[\p{Script=Arabic}]/u.test(message);

            // Set the direction based on the language
            textarea.style.direction = isArabic ? 'rtl' : 'ltr';
            textarea.style.textAlign = isArabic ? 'right' : 'left';

            textarea.value = message;
            const event = new Event('input', {
                bubbles: true,
                cancelable: true,
            });
            textarea.dispatchEvent(event);
            textarea.focus();
        } else {
            console.log('No textarea found with expected placeholder text');
        }
    } catch (error) {
        console.error('Error writing to chat:', error);
    }
}


  function createAIButton() {
    const button = document.createElement('button');
    button.className = 'ai-helper-button';
    button.title = 'AI Response';
    // ChatGPT-style icon
    button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5">
            <path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.979 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.264 8.36823 20.4632C8.48312 20.6624 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6929 12.4801 25.7112 12.4879L33.7631 17.1364C35.4821 18.134 36.7371 19.7713 37.2526 21.6907C37.768 23.6101 37.5011 25.6554 36.5102 27.3774C35.6363 28.897 34.2551 30.0605 32.6091 30.6642C32.6091 30.5955 32.6131 30.474 32.6131 30.3897V21.1887C32.6145 20.9589 32.5547 20.7327 32.4398 20.5335C32.3249 20.3343 32.1591 20.17 31.9594 20.0556H31.955ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.0797 14.8717L27.1153 10.2712C26.9168 10.1554 26.691 10.0942 26.4611 10.0942C26.2312 10.0942 26.0054 10.1554 25.8069 10.2712L16.0832 15.8858V11.9982C16.0821 11.9783 16.0859 11.9585 16.0943 11.9405C16.1027 11.9225 16.1154 11.9068 16.1313 11.8949L24.1825 7.24639C25.9039 6.25384 27.9499 5.98574 29.8701 6.49823C31.7903 7.01071 33.4273 8.26558 34.4229 9.98479C35.3172 11.6013 35.6341 13.4752 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69891 14.5366 9.86377 14.4215 10.0629C14.3065 10.2621 14.2466 10.4885 14.2479 10.7184L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="currentColor"></path>
        </svg>
    `;

    // Add the event listener
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const { conversation_history, customerMessage, customerName } = getConversationData();
        
        console.log('Conversation History:', conversation_history);
        console.log('Customer Message:', customerMessage);
        console.log('Customer Name:', customerName);
        
        try {
            writeToChat('Generating response...');
            const response = await processMessages(
                customerMessage, 
                JSON.stringify(conversation_history),
                customerName
            );
           writeToChat(response);
            } catch (error) {
            console.error('Error processing message:', error);
            writeToChat('Sorry, I encountered an error processing your message.');
        }
    });
      
    return button;
}



function insertAIHelper() {
    // Find both the button and the tooltip
    const savedReplyButton = document.querySelector('div[aria-label="Insert saved reply"]');
    const tooltipText = document.querySelector('div[role="tooltip"]');
    
    if (!savedReplyButton || document.querySelector('.ai-helper-button')) {
        return;
    }

    const aiButton = createAIButton();
    savedReplyButton.style.display = 'none'; // Hide the original button
    savedReplyButton.parentNode.insertBefore(aiButton, savedReplyButton);

    // Create a mutation observer to watch for tooltip changes
    const tooltipObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.textContent === 'Insert saved reply') {
                mutation.target.textContent = 'Generate AI Response';
            }
        });
    });

    // Observe the document body for added tooltip nodes
    const tooltipBodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.getAttribute('role') === 'tooltip') {
                    if (node.textContent === 'Insert saved reply') {
                        node.textContent = 'Generate AI Response';
                    }
                    // Also observe this specific tooltip for text changes
                    tooltipObserver.observe(node, {
                        characterData: true,
                        childList: true,
                        subtree: true
                    });
                }
            });
        });
    });

    tooltipBodyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}



const style = document.createElement('style');
style.textContent = `
    .ai-helper-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 8px;
        position: relative;
        vertical-align: middle;
        width: 32px;
        height: 32px;
    }
    
    .ai-helper-button:hover {
        background-color: rgba(0, 132, 255, 0.1);
    }
    
    .ai-helper-button svg {
        color: #0084ff;
        width: 20px;
        height: 20px;
    }
    
    .ai-helper-button:active {
        transform: scale(0.95);
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

