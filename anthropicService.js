async  function makeAnthropicRequest(messages, modelConfig = {}) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'makeAnthropicRequest',
            messages: messages,
            modelConfig: modelConfig
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
        // Using Haiku for quick product identification
        const modelConfig = {
            model: "claude-3-5-haiku-20241022",
            max_tokens: 500,
            temperature: 0.3
        };

        const storage2 = await chrome.storage.local.get(['productSlugs']);
        const productSlugs = storage2.productSlugs ? storage2.productSlugs.join(', ') : '';
        
        // Create the prompt message
        const promptMessage = {
            role: "user",
            content: `Analyze customer messages to determine if they're inquiring about Apple products and if additional product information is needed.
                          Review both the conversation history and customer message:
                          <customer_message>
                          ${customerMessage}
                          </customer_message>

                          <products_slug>
                          ${productSlugs}
                          </products_slug>

                          <NOTE>
                          IMPORTANT: Treat mentions of Mac, MacBook, iMac, Mac Mini, etc., as references to Mac devices.
                          Also ,assume iPhone [12,13,14,15,16,...]  as iPhone [12,13,14,15,16,...] pro max.
                          
                          </NOTE>
                          Return a JSON response with:
                          <respond>
                          <products_slug>
                          [ array , as iphone-14 , iphone-16-pro-max ,iMac , apple watch...]
                          </products_slug>
                          <needsInfoToAnswer>
                          [true if additional product details needed (price, availability, specs), false otherwise]
                          </needsInfoToAnswer>
                          </respond>
                           
                          Respond only with the JSON format, no additional explanation.`
                        };

        // Get the text content from the response
        console.log('Full prompt for identifyProductInMessage:', promptMessage);
        
        const response = await makeAnthropicRequest([promptMessage], modelConfig);

        // Rest of the function remains the same...
        const responseText = response.content[0].text.trim();
        console.log('input for first ai:', response.content);
        console.log('Raw AI response:', responseText);

        try {
            const parsedResponse = JSON.parse(responseText);
            
            if (!parsedResponse || typeof parsedResponse !== 'object') {
                throw new Error('Response is not an object');
            }

            if (!Array.isArray(parsedResponse.products_slug)) {
                throw new Error('products_slug is not an array');
            }

            if (typeof parsedResponse.needsInfoToAnswer !== 'boolean') {
                throw new Error('needsInfoToAnswer is not a boolean');
            }

            if (parsedResponse.needsInfoToAnswer) {
                const productsData = [];
                const result = await chrome.storage.local.get(['productVariations']);
                const variations = result.productVariations || [];
                
                const matchExactSlug = (searchSlug, targetSlug) => searchSlug === targetSlug;

                const matchRelatedSlug = (searchSlug, targetSlug) => {
                    const normalizeString = (str) => {
                        return str.toLowerCase()
                            .replace(/[-_]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };
                    
                    const normalizedSearch = normalizeString(searchSlug);
                    const normalizedTarget = normalizeString(targetSlug);
                    
                    const searchParts = normalizedSearch.split(' ');
                    const targetParts = normalizedTarget.split(' ');
                    
                    const matchingParts = searchParts.filter(part => 
                        targetParts.some(targetPart => 
                            targetPart.includes(part) || part.includes(targetPart)
                        )
                    );
                    
                    return matchingParts.length >= Math.min(searchParts.length, targetParts.length) * 0.5;
                };

                for (const productSlug of parsedResponse.products_slug) {
                    if (productSlug !== "None") {
                        console.log('Searching for product match:', productSlug);
                        
                        try {
                            const exactProducts = variations.filter(p => 
                                matchExactSlug(productSlug, p.slug)
                            );
                            
                            if (exactProducts.length > 0) {
                                exactProducts.forEach(product => {
                                    productsData.push(compressProduct({
                                        slug: product.slug,
                                        variations: product.variations
                                    }));
                                });
                            } else {
                                const relatedProducts = variations.filter(p => 
                                    matchRelatedSlug(productSlug, p.slug)
                                );
                                
                                if (relatedProducts.length > 0) {
                                    relatedProducts.forEach(product => {
                                        productsData.push(compressProduct({
                                            slug: product.slug,
                                            variations: product.variations
                                        }));
                                    });
                                }
                            }
                        } catch (error) {
                            console.error(`Error searching for product ${productSlug}:`, error);
                        }
                    }
                }
                
                console.log('Got product data:', productsData);
                
                return {
                    needsInfoToAnswer: true,
                    products_slug: parsedResponse.products_slug,
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





async function generateFullResponse(customerMessage, conversationHistory, productInfo, customerName) {
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

        // Get stored settings
        const storage = await chrome.storage.local.get([
            'anthropicApiKey', 
            'guidelines', 
            'offers',
            'modelName',
            'temperature'
        ]);

        if (!storage.anthropicApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }
        const modelConfig = {
            model: storage.modelName || "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            temperature: storage.temperature !== undefined ? parseFloat(storage.temperature) : 0.1
        };


        // Use stored guidelines or default if not set
        const guidelines = storage.guidelines || DEFAULT_GUIDELINES;
        const offers = storage.offers || '';
        const COMPANY_INFO = "iCenter AI Customer Support Response Guide 1. Product Information & Warranty Product Authentication  All products are official Middle East versions Come with manufacturer warranty:  only for iPhone 2 years warranty ,(everythink eals 1 year warranty .) Mac: 1 year warranty + English/Arabic Keyboard + Educational Offer iPad: 1 year replacement warranty AirPods: 1 year replacement warranty Watch: 1 year warranty Accessories: 1 year warranty + MFi Certification   All repairs by Apple-certified technicians using genuine parts 3-months warranty on replaced parts  iPhone Features  Dual SIM: 1 physical SIM + 1 eSIM Up to 8 eSIMs can be stored Enhanced security features - cannot be removed Myth clarification: eSIM does not cause device overheating  2. Delivery & Payment Delivery Policy  Orders above 50,000 IQD: Free delivery Orders below 50,000 IQD: 5,000 IQD fee Delivery time: 3-5 working days Cash on delivery available  Payment Options  Cash on delivery Credit Card FIB Installments through Miswag (Qi Card holders) Visit: https://miswag.com/merchant/icenter  Trade-in Services  Available for: Phones, Laptops, Tablets Not eligible: AirPods Instant price estimate: https://tradein.icenter-iraq.com/ir-en/  3. Locations & Contact Information Erbil (Main)  Location: Ankawa - Bakhtiari Road Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 7418146 Sales: 07508942096 Service: 07502347717 Bazaar Support: 07503116716   Link: https://g.page/r/CXfdCsQBBjaUEAo  Baghdad  Location: Al-Zayyouna - Al-Rubaie Street Showroom: 10:00 AM - 11:00 PM (Fri: Closed) Service: 10:00 AM - 6:00 PM (Fri: Closed) Contacts:  Showroom: 07707071307 Service: 07727854040   Link: https://g.page/r/CQN3vQVtdD0pEAo  Sulaymaniyah  Bakhtiari Branch:  Location: Near Talari Honar Hours: 9:00 AM - 11:00 PM daily Contacts:  Showroom: 07727851010 Sales: 07508942096 Mawlawi Support: 07700834666   No Service Department Link: https://g.page/r/CUUuoTpLgJWnEAo   King Mahmoud Branch:  Location: Zargata Bridge Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Sales: 07727856060 Service: 07727852020   Link: https://maps.app.goo.gl/FdYh2Uj7Vi9MSR1q8    Duhok  Location: Opposite Judy Restaurant Showroom: 9:00 AM - 11:00 PM daily Service: 9:00 AM - 5:00 PM (Thu: 9:00 AM - 1:00 PM, Fri: Closed) Contacts:  Showroom: 0751 741 8151 Sales: 07508942096 Service: 07503303141   Link: https://g.page/r/CUTb5TGpqtr1EAo  4. if really necessary  you have this (  Online Sales: 07508942096 B2B Inquiries: 07505122022 Marketing: 07509849454 ) 5. Warranty Coverage Details  Duration: As per product specification Covered:  Manufacturing defects Normal functionality issues   Not covered:  Physical damage Water damage Misuse   Special notes:  iPads and AirPods: Replacement warranty Other products: Repair warranty   Backorder options Out of production explanations with alternative suggestions  7. Service Quality Assurance  All repairs performed by Apple-certified technicians Only genuine Apple parts and tools used 3-months warranty on all replaced parts Service quality guaranteed . B2B requests: Forward to B2B team (07505122022)";
        const messages = [{
            role: "user",
            content: `You are an AI sales assistant for iCenter, an authorized Apple reseller and service provider in Iraq Kurdistan. Your goal is to provide excellent customer service, answer inquiries, and promote sales of Apple products and services.
        
        **Company Information:**
        <company_info>
        ${COMPANY_INFO}
        </company_info>
        
        **Conversation History:**
        <conversation_history>
        ${formattedHistory}
        </conversation_history>
        
        **Product Information:**
        - Format:
          - **Product Slug**: "product_slug"
          - **Variations**: An array of variations, each with:
            - **Name**: "Variation Name"
            - **Price**: "Price in IQD"
            - **Availability**: 1 (in stock) or 0 (out of stock) or 2 (out of production)
        <product_info>
        ${productInfo}
        </product_info>
        
        **Customer Information:**
        - **Name**: ${customerName} (do not translate the name)
        
        **Current Offers:**
        <offers>
        ${offers}
        </offers>
        
        **Offer Guidelines:**
        1. **Never assume or extend offers** beyond what's explicitly stated in the **Current Offers** section.
        2. For every offer mentioned:
           - Verify the exact conditions in the **Current Offers** section.
           - Mention only offers that precisely match the customer's scenario.
           - Include all conditions for that specific offer.
        3. When discussing prices:
           - Check if any offers apply based on the exact conditions listed.
           - If conditions aren't fully met, quote the regular price only.
        4. Format for discussing offers:
           - State the offer.
           - State all required conditions.
           - Discuss the price impact only after conditions are clear.
        
        **Response Guidelines:**
        - **Language**: Respond in the **same language** as the customer's message.
        - **Tone**: Maintain a friendly, helpful, and sales-oriented tone.
        - **Length**: Keep your response under **400 characters**.
        - **Availability**: Clearly state if the product is available based on the **Product Information**.
        - **Prohibited Language**: **Do not** use the word "warehouse" or reference it in any form.
        - **Contact Information**: **Do not include phone numbers, email addresses, or any contact information unless the customer explicitly requests it.**
        - **Formatting**: Enclose your response within <answer> tags.
        - **Completeness**: Ensure all questions and concerns raised by the customer are fully addressed in your response.
        **Response Guidelines:**
        - **Product Origin**: If the customer inquires about the product's origin or model type, inform them that it is a **"موديل شرق أوسط"** (Middle East model).

        **Note:**
        - Preferred term for "out of stock" is **"not available"**.
        - Avoid using **"بالمخزون"** as it is not commonly used in the local dialect.        
        Now, please compose a response to the customer's message below:
        
        **Customer Message:**
        <customer_message>
        ${customerMessage}
        </customer_message>
        
        **Your Response:**
        <answer>
        [Your response goes here]
        </answer>`
        }];

        console.log("Using model configuration:", {
            model: modelConfig.model,
            temperature: modelConfig.temperature
        });
        console.log("The prompt of generateFullResponse AI:", messages[0], "End of prompt");    
        const response = await makeAnthropicRequest(messages, modelConfig);
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

function getStockStatus(stockStatus) {
    const normalizedStatus = stockStatus.toLowerCase().replace(/\s+/g, '');
    
    if (normalizedStatus === 'instock') {
      return 1; // In stock
    } else if (normalizedStatus === 'outofstock') {
      return 0; // Out of stock
    } else if (normalizedStatus === 'outofproduction') {
      return 2; // Out of production
    } else {
      return -1; // Unknown status
    }
  }
  
  function compressProduct(product) {
    return [
      product.slug,  // [0] product slug
      product.variations.map(v => [
        v.name,                   // [0] full variation name
        `${v.price}IQD`,          // [1] price with currency
        getStockStatus(v.stock_status)  // [2] stock status
      ])
    ];
  }


export {
    generateFullResponse,
    identifyProductInMessage
};

