// anthropicService.js
const WooProductsService = require('./getWoocomerceProd');

// Company data and guidelines
const COMPANY_DATA = `
# iCenter AI Customer Support Response Guide
1. Product Information & Warranty
- iCenter is an authorized Apple reseller in Iraq Kurdistan
- We provide official Apple warranty and support
- Product authentication and verification services available

2. Customer Service Guidelines
- Always be polite and professional
- Provide accurate product information
- Direct warranty inquiries to our service center
- Maintain a helpful and friendly tone

3. Store Information
- Multiple locations across Kurdistan
- Official Apple service and support
- Genuine Apple products and accessories
`;

// Helper function to make API calls through background script
async function makeAnthropicRequest(messages) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'makeAnthropicRequest',
            messages: messages
        });

        if (!response.success) {
            throw new Error(response.error);
        }

        return response.data;
    } catch (error) {
        console.error('Error in makeAnthropicRequest:', error);
        throw error;
    }
}

// Function to identify Apple products and fetch WooCommerce data if needed
async function identifyProductInMessage(customerMessage, conversation_history, slugsText = '') {
    try {
        const response = await makeAnthropicRequest([
            {
                role: "user",
                content: `Analyze customer messages to determine if they're inquiring about Apple products and if additional product information is needed.
                            Review both the conversation history and customer message:
                            <conversation_history>
                            ${conversation_history}
                            </conversation_history>
                            <customer_message>
                            ${customerMessage}
                            </customer_message>
                            Return a JSON response with:

                            productName: The Apple product mentioned/implied (e.g., iPhone, iPad, MacBook) or "None"
                            needsInfoToAnswer: true if additional product details needed (price, availability, specs), false otherwise

                             Include:
                            - Existing Apple products
                            - Possible misspellings
                            - Rumored/future products
                            - Any tech that could be Apple-related

                            Format:
                            {
                            "productName": [product name or "null"],
                            "needsInfoToAnswer": true/false
                            }

                            Respond only with the JSON format, no additional explanation.`
            }
        ]);

        // Get the text content from the response
        const responseText = response.content[0].text.trim();
        
        // Log the response for debugging
        console.log('Raw AI response:', responseText);

        try {
            // Parse the JSON response
            const parsedResponse = JSON.parse(responseText);
            
            // Validate the response structure
            if (!parsedResponse || typeof parsedResponse !== 'object') {
                throw new Error('Response is not an object');
            }

            if (!Array.isArray(parsedResponse.productName)) {
                throw new Error('productName is not an array');
            }

            if (typeof parsedResponse.needsInfoToAnswer !== 'boolean') {
                throw new Error('needsInfoToAnswer is not a boolean');
            }

            // If additional product info is needed, search WooCommerce
            if (parsedResponse.needsInfoToAnswer && parsedResponse.productName[0] !== "null") {
                // Use the first identified product name for searching
                const searchTerm = parsedResponse.productName[0];
                
                // Search WooCommerce for the product
                const productResult = await WooProductsService.enhancedProductSearch(searchTerm, slugsText);
                
                // Return the WooCommerce product data
                return {
                    needsInfoToAnswer: true,
                    productData: productResult
                };
            }

            // If no additional info needed, return just the flag
            return {
                needsInfoToAnswer: false,
                productData: null
            };

        } catch (parseError) {
            console.error('Error processing response:', parseError);
            return {
                needsInfoToAnswer: false,
                productData: null
            };
        }
        
    } catch (error) {
        console.error('Error in product identification:', error);
        throw error;
    }
}

// Main function to generate responses
async function generateFullResponse(customerMessage, conversationHistory) {
    try {
        // Ensure conversationHistory is properly formatted
        let formattedHistory = '';
        try {
            if (typeof conversationHistory === 'string') {
                formattedHistory = conversationHistory;
            } else if (Array.isArray(conversationHistory)) {
                formattedHistory = conversationHistory
                    .map(msg => `${msg.role}: ${msg.content}`)
                    .join('\n');
            } else {
                formattedHistory = JSON.stringify(conversationHistory);
            }
        } catch (error) {
            console.error('Error formatting conversation history:', error);
            formattedHistory = '';
        }

        // Prepare the message for Claude
        const messages = [{
            role: "user",
            content: `You are an AI assistant for iCenter, an authorized Apple reseller in Iraq Kurdistan. 
            Your task is to respond to customer messages on the company account.

            Company Information:
            ${COMPANY_DATA}

            Previous Conversation:
            ${formattedHistory}

            Customer Message:
            ${customerMessage}

            Instructions:
            1. Keep your response under 100 characters
            2. Be helpful and professional
            3. Stick to facts about Apple products and iCenter services
            4. If unsure, ask for clarification
            5. Format your response between <answer> tags

            Please respond to the customer's message.`
        }];

        // Make API call through background script
        const response = await makeAnthropicRequest(messages);

        // Extract response from Claude
        if (response && response.content && response.content[0] && response.content[0].text) {
            const text = response.content[0].text;
            // Extract text between <answer> tags if present
            const match = text.match(/<answer>(.*?)<\/answer>/s);
            return match ? match[1].trim() : text.trim();
        } else {
            throw new Error('Invalid response format from API');
        }

    } catch (error) {
        console.error('Error in generateFullResponse:', error);
        return "I apologize, but I'm having trouble processing your request right now. Please try again.";
    }
}

// Export functions
export {
    generateFullResponse,
    identifyProductInMessage
};