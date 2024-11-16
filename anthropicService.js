async function makeAnthropicRequest(messages) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'makeAnthropicRequest',
            messages: messages
        });

        if (!response) {
            throw new Error('No response from background script');
        }

        if (!response.success) {
            throw new Error(response.error || 'Unknown error occurred');
        }

        return response.data;
    } catch (error) {
        console.error('Error in makeAnthropicRequest:', error);
        throw error;
    }
}
async function identifyProductInMessage(customerMessage, conversation_history) {
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

                            productNames: Array of Apple products mentioned/implied (e.g., ["iPhone", "iPad", "MacBook"]) or ["None"]
                            needsInfoToAnswer: true if additional product details needed (price, availability, specs), false otherwise

                             Include:
                            - Existing Apple products
                            - Possible misspellings
                            - Rumored/future products
                            - Any tech that could be Apple-related

                            Example responses:
                            For "What's the price difference between iPhone and iPad?":
                            {
                                "productNames": ["iPhone", "iPad"],
                                "needsInfoToAnswer": true
                            }

                            For "How do I turn on my iPad?":
                            {
                                "productNames": ["iPad"],
                                "needsInfoToAnswer": false
                            }

                            For "What's the warranty on iPhone, iPad and MacBook?":
                            {
                                "productNames": ["iPhone", "iPad", "MacBook"],
                                "needsInfoToAnswer": true
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

            if (!Array.isArray(parsedResponse.productNames)) {
                throw new Error('productNames is not an array');
            }

            if (typeof parsedResponse.needsInfoToAnswer !== 'boolean') {
                throw new Error('needsInfoToAnswer is not a boolean');
            }

            // If additional product info is needed, search WooCommerce for each product
            if (parsedResponse.needsInfoToAnswer) {
                const productsData = [];
                
                // Get data for each product
                for (const productName of parsedResponse.productNames) {
                    if (productName !== "None") {
                        console.log('Searching for product:', productName);
                        
                        try {
                            // Send message to background script to search WooCommerce
                            const response = await chrome.runtime.sendMessage({
                                type: 'searchWooCommerceProducts',
                                searchTerm: productName
                            });

                            if (response && response.success && response.data) {
                                productsData.push({
                                    searchTerm: productName,
                                    results: response.data
                                });
                            }
                        } catch (error) {
                            console.error(`Error searching for product ${productName}:`, error);
                        }
                    }
                }
                
                console.log('Got product data:', productsData);
                
                return {
                    needsInfoToAnswer: true,
                    productNames: parsedResponse.productNames,
                    productsData: productsData
                };
            } else {
                return {
                    needsInfoToAnswer: false
                };
            }

        } catch (parseError) {
            console.error('Error processing response:', parseError);
            console.error('Response text was:', responseText);
            return {
                needsInfoToAnswer: false
            };
        }
        
    } catch (error) {
        console.error('Error in product identification:', error);
        throw error;
    }
}


async function generateFullResponse(customerMessage, conversationHistory) {
    try {
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

        // First check if API key is set
        const storage = await chrome.storage.local.get(['anthropicApiKey']);
        if (!storage.anthropicApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }

        const messages = [{
            role: "user",
            content: `You are an AI assistant for iCenter, an authorized Apple reseller and service provider in Iraq Kurdistan. Your task is to respond to customer messages on the company account. Here is the essential information about the company and its products:

                      <company_info>
                     iCenter AI Customer Support Response Guide 1. Product Information & Warranty Product Authentication  All products are official Middle East versions Come with manufacturer warranty:  iPhone: 2 years warranty Mac: 1 year warranty + English/Arabic Keyboard + Educational Offer iPad: 1 year replacement warranty AirPods: 1 year replacement warranty Watch: 1 year warranty Accessories: 1 year warranty + MFi Certification   All repairs by Apple-certified technicians using genuine parts 3-months warranty on replaced parts  iPhone Features  Dual SIM: 1 physical SIM + 1 eSIM Up to 8 eSIMs can be stored Enhanced security features - cannot be removed Myth clarification: eSIM does not cause device overheating  2. Delivery & Payment Delivery Policy  Orders above 50,000 IQD: Free delivery Orders below 50,000 IQD: 5,000 IQD fee Delivery time: 3-5 working days Cash on delivery available  Payment Options  Cash on delivery Credit Card FIB Installments through Miswag (Qi Card holders) Visit: https://miswag.com/merchant/icenter  Trade-in Services  Available for: Phones, Laptops, Tablets Not eligible: AirPods Instant price estimate: https://tradein.icenter-iraq.com/ir-en/  3. Locations & Contact Information Erbil (Main)  Location: Ankawa - Bakhtiari Road Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 7418146 Sales: 07508942096 Service: 07502347717 Bazaar Support: 07503116716   Link: https://g.page/r/CXfdCsQBBjaUEAo  Baghdad  Location: Al-Zayyouna - Al-Rubaie Street Showroom: 10:00 AM - 11:00 PM (Fri: Closed) Service: 10:00 AM - 6:00 PM (Fri: Closed) Contacts:  Showroom: 07707071307 Service: 07727854040   Link: https://g.page/r/CQN3vQVtdD0pEAo  Sulaymaniyah  Bakhtiari Branch:  Location: Near Talari Honar Hours: 9:00 AM - 11:00 PM daily Contacts:  Showroom: 07727851010 Sales: 07508942096 Mawlawi Support: 07700834666   No Service Department Link: https://g.page/r/CUUuoTpLgJWnEAo   King Mahmoud Branch:  Location: Zargata Bridge Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Sales: 07727856060 Service: 07727852020   Link: https://maps.app.goo.gl/FdYh2Uj7Vi9MSR1q8    Duhok  Location: Opposite Judy Restaurant Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 741 8151 Sales: 07508942096 Service: 07503303141   Link: https://g.page/r/CUTb5TGpqtr1EAo  4. Additional Support  Online Sales: 07508942096 B2B Inquiries: 07505122022 Marketing: 07509849454  5. Warranty Coverage Details  Duration: As per product specification Covered:  Manufacturing defects Normal functionality issues   Not covered:  Physical damage Water damage Misuse   Special notes:  iPads and AirPods: Replacement warranty Other products: Repair warranty    6. Product Availability Status In Stock  Online order + free delivery Pick-up reservation available  Out of Stock  Alternative variation suggestions Alternative product recommendations Backorder options Out of production explanations with alternative suggestions  7. Service Quality Assurance  All repairs performed by Apple-certified technicians Only genuine Apple parts and tools used 3-months warranty on all replaced parts Service quality guaranteed .  ### Response Guidelines  1. Always greet the customer professionally 2. Identify the main inquiry category 3. Use the appropriate template as a base 4. Customize the response based on specific customer needs 5. Include relevant contact information 6. End with an offer for additional assistance  ### Service Escalation Protocol   If a customer's query involves:  1. Complex technical issues: Direct to relevant service department  2. Delivery delays: Acknowledge and provide tracking information   3. Warranty disputes: Escalate to service department 4. Payment issues: Direct to relevant showroom  5. B2B requests: Forward to B2B team (07505122022)    ### Response Best Practices  1. **Accuracy**: Double-check all numbers and prices before sending  2. **Clarity**: Use clear, simple language 3. **Completeness**: Include all relevant information in one response 4. **Timeliness**: Mention business hours when scheduling visits  5. **Follow-up**: Offer additional assistance   6. **Politeness**: Maintain professional courtesy regardless of customer tone

                      <products slug>
                     iphone-16/
iphone-16-plus/
iphone-16-pro/
iphone-16-pro-max/
apple-watch-series-10/
apple-watch-ultra-2-new/
apple-watch-se-new/
airpods-max-new/
ipad-air-11-inch-m2/
ipad-air-13-inch-m2/
ipad-pro-11-inch-m4/
ipad-pro-13-inch-m4/
macbook-air-15-inch-m3/
macbook-air-13-inch-m3/
macbook-pro-16-inch-m3-pro-or-m3-max/
macbook-pro-14-inch-m3-pro-or-m3-max/
imac-24-inch-m3/
apple-watch-se/
macbook-pro-14-inch-m3/
airpods-max/
apple-watch-ultra-2/
apple-watch-series-9/
iphone-15-plus/
iphone-15-pro/
iphone-15/
iphone-15-pro-max/
apple-watch-se-2nd-generation/
apple-watch-series-8/
apple-watch-ultra-1/
ipad-mini-6th-generation/
ipad-9th-generation/
ipad-10th-generation/
ipad-air-5th-generation/
ipad-pro-11-inch-4th-generation/
ipad-pro-12-9-inch-6th-generation/
iphone-14-pro-max/
iphone-14-pro/
iphone-14-plus/
iphone-14/
iphone-13/
iphone-12/
iphone-11/
mac-mini-m2-or-m2-pro/
imac-24-inch-m1/
macbook-pro-13-inch-m2/
macbook-pro-16-inch-m2-pro-or-m2-max/
macbook-pro-14-inch-m2-pro-or-m2-max/
macbook-air-13-inch-m1/
macbook-air-13-inch-m2/
macbook-air-15-inch-m2/
                      </products slug>

                      Your primary goal is to make sales while providing excellent customer service. but dont push it so hard. You should be helpful and informative, but always look for opportunities to promote products and services. Feel free to be creative in your approach to making a sale, including asking questions, making suggestions, or recommending alternative products if appropriate.

                      <customer_message>
                      ${customerMessage}
                      </customer_message>

                      For context, here is the conversation history:
                      <conversation_history>
                      ${conversationHistory}
                      </conversation_history>

                      When responding to the customer:

                      1. Analyze the customer's message and the conversation history to understand their needs and interests.
                      2. Provide relevant information about products or services based on the customer's inquiry.
                      3. If the information you have is not sufficient to answer the customer's question, provide a link to the relevant page on the iCenter website (https://www.icenter-iraq.com).
                      4. Look for opportunities to upsell or cross-sell products and services.
                      5. Use a friendly, helpful tone while maintaining a focus on making a sale.
                      6. Feel free to ask questions or make suggestions that could lead to a sale.
                      7. If appropriate, recommend alternative devices or services that might better suit the customer's needs.
                      9. For ANY questions about pricing, availability, specifications, or features, ALWAYS include the relevant product page link: https://www.icenter-iraq.com/[product-slug]                    10. Never guess or make assumptions about prices or availability.
                     11. Only provide information or links that is explicitly present in the data
                     12. If pricing or product details are unclear, say "Please click on the link for current pricing and availability".
                    
                     IMPORTANT RULES:
                    - NEVER provide specific prices for any products
                    - NEVER make assumptions about product availability
                    - ONLY use information explicitly provided in the data above
                    - For ALL pricing and availability questions, direct customers to: https://www.icenter-iraq.com/[product-slug]
                    
                    For pricing questions:
                     "Please check current pricing at: https://www.icenter-iraq.com/[product-slug]"

                      For availability questions:
                      "For real-time availability, please visit: https://www.icenter-iraq.com/[product-slug]"
                      Format your response as follows:

                      <answer>
                      [Your response to the customer here , with the URL of the product or page if needed] must be under 100 characters
                      </answer>

                     Before sending your response, verify:
                    - Does my response include any specific prices? If yes, remove them
                    - Did I make any assumptions about availability? If yes, remove them
                    - Is all information coming directly from the provided data? If no, remove external information
                    - Have I included the correct website link? If no, add it
                      Remember, your main goal is to make sales while providing helpful information to the customer. Be creative and persuasive in your approach, and don't hesitate to guide the conversation towards a potential sale. must be under 100 characters
`
        }];

        const response = await makeAnthropicRequest(messages);

        if (response && response.content && response.content[0] && response.content[0].text) {
            const text = response.content[0].text;
            const match = text.match(/<answer>(.*?)<\/answer>/s);
            return match ? match[1].trim() : text.trim();
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error in generateFullResponse:', error);
        if (error.message.includes('API key')) {
            return "Please set up your Anthropic API key in the extension settings (click the extension icon in your browser toolbar).";
        }
        return "I apologize, but I'm having trouble processing your request right now. Please try again.";
    }
}

export {
    generateFullResponse
};

