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

                            Respond only with the JSON format, no additional explanation.`
            }
        ]);

        // Get the text content from the response
        const responseText = response.content[0].text.trim();
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

            // If additional product info is needed, search for variations
            if (parsedResponse.needsInfoToAnswer) {
                const productsData = [];
                
                // Get stored product variations
                const result = await chrome.storage.local.get(['productVariations']);
                const variations = result.productVariations || [];
                
                // Function to normalize text for comparison
                const normalizeText = (text) => {
                    return text.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric chars with hyphen
                        .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
                        .trim();
                };

                // Function to check if strings are similar enough
                const isSimilarEnough = (str1, str2) => {
                    const norm1 = normalizeText(str1);
                    const norm2 = normalizeText(str2);
                    
                    // Check for exact match after normalization
                    if (norm1 === norm2) return true;
                    
                    // Check if one contains the other
                    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

                    // Check for product name with number (e.g., "iphone 14" matches "iphone-14-pro")
                    const words1 = norm1.split('-');
                    const words2 = norm2.split('-');
                    
                    // If first two words match (e.g., "iphone" and "14"), consider it a match
                    if (words1.length >= 2 && words2.length >= 2) {
                        return words1[0] === words2[0] && words1[1] === words2[1];
                    }

                    return false;
                };
                
                // Get data for each product
                for (const productName of parsedResponse.productNames) {
                    if (productName !== "None") {
                        console.log('Searching for product:', productName);
                        
                        try {
                            // Search for matching products
                            const matchingProducts = variations.filter(p => 
                                isSimilarEnough(p.slug, productName));
                            
                            // Add all matching products to the results
                            matchingProducts.forEach(product => {
                                productsData.push(compressProduct({
                                    slug: product.slug,
                                    variations: product.variations                                  
                                }));
                            });
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


async function generateFullResponse(customerMessage, conversationHistory , productInfo) {
    try {
        let formattedHistory = '';
        const storage2 = await chrome.storage.local.get(['productSlugs']);
        const productSlugs = storage2.productSlugs ? storage2.productSlugs.join(', ') : '';

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
        const storage1 = await chrome.storage.local.get(['anthropicApiKey']);
        if (!storage1.anthropicApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }

        const messages = [{
            role: "user",
            content: `You are an AI assistant for iCenter, an authorized Apple reseller and service provider in Iraq Kurdistan. Your task is to respond to customer messages on the company account. Here is the essential information about the company and its products:
                      Your primary goal is to make sales while providing excellent customer service. but dont push it so hard. You should be helpful and informative, but always look for opportunities to promote products and services. Feel free to be creative in your approach to making a sale, including asking questions, making suggestions, or recommending alternative products if appropriate.

                      <company_info>
                     iCenter AI Customer Support Response Guide 1. Product Information & Warranty Product Authentication  All products are official Middle East versions Come with manufacturer warranty:  iPhone: 2 years warranty Mac: 1 year warranty + English/Arabic Keyboard + Educational Offer iPad: 1 year replacement warranty AirPods: 1 year replacement warranty Watch: 1 year warranty Accessories: 1 year warranty + MFi Certification   All repairs by Apple-certified technicians using genuine parts 3-months warranty on replaced parts  iPhone Features  Dual SIM: 1 physical SIM + 1 eSIM Up to 8 eSIMs can be stored Enhanced security features - cannot be removed Myth clarification: eSIM does not cause device overheating  2. Delivery & Payment Delivery Policy  Orders above 50,000 IQD: Free delivery Orders below 50,000 IQD: 5,000 IQD fee Delivery time: 3-5 working days Cash on delivery available  Payment Options  Cash on delivery Credit Card FIB Installments through Miswag (Qi Card holders) Visit: https://miswag.com/merchant/icenter  Trade-in Services  Available for: Phones, Laptops, Tablets Not eligible: AirPods Instant price estimate: https://tradein.icenter-iraq.com/ir-en/  3. Locations & Contact Information Erbil (Main)  Location: Ankawa - Bakhtiari Road Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 7418146 Sales: 07508942096 Service: 07502347717 Bazaar Support: 07503116716   Link: https://g.page/r/CXfdCsQBBjaUEAo  Baghdad  Location: Al-Zayyouna - Al-Rubaie Street Showroom: 10:00 AM - 11:00 PM (Fri: Closed) Service: 10:00 AM - 6:00 PM (Fri: Closed) Contacts:  Showroom: 07707071307 Service: 07727854040   Link: https://g.page/r/CQN3vQVtdD0pEAo  Sulaymaniyah  Bakhtiari Branch:  Location: Near Talari Honar Hours: 9:00 AM - 11:00 PM daily Contacts:  Showroom: 07727851010 Sales: 07508942096 Mawlawi Support: 07700834666   No Service Department Link: https://g.page/r/CUUuoTpLgJWnEAo   King Mahmoud Branch:  Location: Zargata Bridge Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Sales: 07727856060 Service: 07727852020   Link: https://maps.app.goo.gl/FdYh2Uj7Vi9MSR1q8    Duhok  Location: Opposite Judy Restaurant Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 741 8151 Sales: 07508942096 Service: 07503303141   Link: https://g.page/r/CUTb5TGpqtr1EAo  4. Additional Support  Online Sales: 07508942096 B2B Inquiries: 07505122022 Marketing: 07509849454  5. Warranty Coverage Details  Duration: As per product specification Covered:  Manufacturing defects Normal functionality issues   Not covered:  Physical damage Water damage Misuse   Special notes:  iPads and AirPods: Replacement warranty Other products: Repair warranty    6. Product Availability Status In Stock  Online order + free delivery Pick-up reservation available  Out of Stock  Alternative variation suggestions Alternative product recommendations Backorder options Out of production explanations with alternative suggestions  7. Service Quality Assurance  All repairs performed by Apple-certified technicians Only genuine Apple parts and tools used 3-months warranty on all replaced parts Service quality guaranteed . B2B requests: Forward to B2B team (07505122022)
                      </company_info>

                      <products_slug>
                     ${productSlugs}
                      </products_slug>

                      <customer_message>
                      ${customerMessage}
                      </customer_message>

                      For context, here is the conversation history:
                      <conversation_history>
                      ${conversationHistory}
                      </conversation_history>

                      productInfo format:          
                      ["Variation Name", "price", stockStatus],
                      ["Another Variation", "price", stockStatus]
                      <productInfo>
                      ${productInfo}
                      </productInfo>
                      

                      When responding to the customer:

                      1. Analyze the customer's message and the conversation history to understand their needs and interests.
                      2. Provide relevant information about products or services based on the customer's inquiry.
                      3. If the information you have is not sufficient to answer the customer's question, provide a link to the relevant page on the iCenter website (https://www.icenter-iraq.com).
                      4. Look for opportunities to upsell or cross-sell products and services.
                      5. Use a friendly, helpful tone while maintaining a focus on making a sale.
                      6. Feel free to ask questions or make suggestions that could lead to a sale.
                      7. If appropriate, recommend alternative devices or services that might better suit the customer's needs.
                      9. For ANY questions about pricing, availability, specifications, or features, ALWAYS include the relevant product page link: https://www.icenter-iraq.com/[product-slug]                    
                      10. Never guess or make assumptions about prices or availability.
                      11. Only provide information or links that is explicitly present in the data
                      12. If pricing or product details are unclear, say "Please click on the link for current pricing and availability".
                      13. Delivery delays: Acknowledge and provide tracking information
                      14. Maintain professional courtesy regardless of customer tone
                      15. Mention business hours when scheduling visits  
                      16. ONLY use information explicitly provided in the data above
                      17. For ordering direct the customer visit: https://www.icenter-iraq.com/[product-slug]"
                      Format your response as follows:

                      <answer>
                      [Your response to the customer in ckb or Arabic or English, with the URL of the product or page if needed] must be under 150 characters
                      </answer>

                     Before sending your response, verify:
                    - Have I included the correct website link? If no, add it.
                    
                      **REMEMBER, your main goal is to make sales while providing helpful information to the customer. Be creative and persuasive in your approach, and don't hesitate to guide the conversation towards a potential sale.** 
                      must be under 150 characters
`
        }];

        const response = await makeAnthropicRequest(messages);
        console.log("The input to generateFullResponse :",messages[0].content);
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

function compressProduct(product) {
    return [
      product.slug,  // [0] product slug
      product.variations.map(v => [
        v.name,           // [0] full variation name
        `${v.price}IQD`,  // [1] price with currency
        v.stock_status === 'instock' ? 1 : 0  // [2] stock status (1=in stock, 0=out of stock)
      ])
    ];
  }
  


export {
    generateFullResponse,
    identifyProductInMessage
};

