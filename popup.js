// popup.js
// AIEffect class definition
let isAdvancedMode = false;
let isCommandPressed = false;
// Add this at the top of popup.js
const DEFAULT_GUIDELINES = `Guidelines for customer interaction:
1. Always be polite, professional, and enthusiastic about Apple products and services.
2. Address the customer by their name when appropriate.
3. Provide accurate information based on the company info and product info.
4. Look for opportunities to upsell or cross-sell products and services that may benefit the customer.
5. Be mindful of the customer's previous interactions and purchases when making recommendations.

When handling customer inquiries:
1. Carefully read the customer's message to understand their needs or concerns.
2. Provide relevant information from the company info or product info.
3. If the customer has a history of purchases or inquiries, reference this information when appropriate to personalize the interaction.
4. Answer questions concisely and accurately.
5. Always look for opportunities to highlight the benefits of iCenter's products and services.

Sales techniques and upselling guidelines:
1. Identify the customer's needs based on their inquiry and history.
2. Suggest complementary products or services that enhance their potential purchase.
3. Highlight special offers, discounts, or promotions that may be relevant to the customer.
4. Emphasize the unique benefits of purchasing from iCenter, such as authorized service and support.
5. If a product is not available , suggest similar alternatives or offer to notify the customer when it becomes available.

To respond to the customer, follow these steps:
1. Greet the customer by name and thank them for their message.
2. Address their specific inquiry or concern.
3. Provide relevant information from the company info or product info.
4. Look for opportunities to promote products or services.
5. End with a polite closing and an invitation for further questions.
6. your respond MUST be high level of writing.
7. In the end of the message, don't ask to contact us.
** MUST NEVER give our contact numbers in the respond,(You can give it only when the customer asks for)**
RESPOND MUST HAVE NO MISTAKE or MISSPELLING`;


function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Function to save specific settings
async function saveSettings(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    console.log(`Auto-saved ${key}`);
    
    // Show a subtle success indication
    const statusElement = document.getElementById('status');
    statusElement.textContent = 'Changes saved automatically';
    statusElement.className = 'status success';
    statusElement.style.opacity = '0.7';
    statusElement.style.transform = 'translateY(0)';
    
    setTimeout(() => {
      statusElement.style.opacity = '0';
      statusElement.style.transform = 'translateY(-10px)';
    }, 1500);
  } catch (error) {
    console.error('Error auto-saving settings:', error);
  }
}

// Debounced save function
const debouncedSave = debounce(saveSettings, 500);



class AIEffect {
  constructor() {
    this.container = document.getElementById('aiEffectContainer');
    this.isAnimating = false;
  }

  createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 10 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    
    const tx = (Math.random() - 0.5) * 200;
    const ty = (Math.random() - 0.5) * 200;
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    
    particle.style.animation = `particleAnimation ${Math.random() * 1 + 0.5}s ease-out forwards`;
    
    this.container.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }

  createEnergyRing(x, y) {
    const ring = document.createElement('div');
    ring.className = 'energy-ring';
    
    const size = 60;
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.left = `${x - size/2}px`;
    ring.style.top = `${y - size/2}px`;
    
    ring.style.animation = 'ringExpand 1s ease-out forwards';
    
    this.container.appendChild(ring);
    setTimeout(() => ring.remove(), 1000);
  }

  createPowerWave(y) {
    const wave = document.createElement('div');
    wave.className = 'power-wave';
    wave.style.top = `${y}px`;
    wave.style.animation = 'powerWave 0.8s ease-out forwards';
    
    this.container.appendChild(wave);
    setTimeout(() => wave.remove(), 800);
  }

  createCircuitLine(x, y, width, height) {
    const line = document.createElement('div');
    line.className = 'circuit-line';
    line.style.left = `${x}px`;
    line.style.top = `${y}px`;
    line.style.width = `${width}px`;
    line.style.height = `${height}px`;
    line.style.animation = 'circuitFlow 0.6s ease-out forwards';
    
    this.container.appendChild(line);
    setTimeout(() => line.remove(), 600);
  }

  async activate(buttonElement) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const rect = buttonElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    this.container.classList.add('active');
    buttonElement.classList.add('power-active');
    
    // Create initial burst
    for (let i = 0; i < 20; i++) {
      this.createParticle(centerX, centerY);
    }
    
    // Create expanding rings
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createEnergyRing(centerX, centerY);
      }, i * 200);
    }
    
    // Create power waves
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.createPowerWave(Math.random() * window.innerHeight);
      }, i * 150);
    }
    
    // Create circuit lines
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const isHorizontal = Math.random() > 0.5;
        const width = isHorizontal ? Math.random() * 100 + 50 : 2;
        const height = isHorizontal ? 2 : Math.random() * 100 + 50;
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        this.createCircuitLine(x, y, width, height);
      }, i * 100);
    }
    
    // Return a promise that resolves when the animation is complete
    return new Promise(resolve => {
      setTimeout(() => {
        this.container.classList.remove('active');
        buttonElement.classList.remove('power-active');
        this.isAnimating = false;
        resolve();
      }, 1500);
    });
  }
}

// Main document ready handler
document.addEventListener('DOMContentLoaded', () => {
  const advancedSection = document.getElementById('advancedSettings');
  //const advancedHint = document.getElementById('advancedHint');
  const advancedToggle = document.getElementById('advancedToggle');
  let isAdvancedMode = false;
  const saveButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const wooKeyInput = document.getElementById('wooKey');
  const wooSecretInput = document.getElementById('wooSecret');
  const offersInput = document.getElementById('offers');
  const guidelinesInput = document.getElementById('guidelines');
  const modelSelect = document.getElementById('modelSelect');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValue = document.getElementById('temperatureValue');

  advancedToggle.addEventListener('click', () => {
    isAdvancedMode = !isAdvancedMode;
    advancedToggle.classList.toggle('active');
    advancedSection.classList.toggle('visible');
    updateButtonText(hasData); // Your existing function
  });

// Update temperature display
temperatureSlider.addEventListener('input', () => {
  temperatureValue.textContent = temperatureSlider.value;
});


  // Initialize AI Effect
  const aiEffect = new AIEffect();
  modelSelect.addEventListener('change', () => {
    debouncedSave('modelName', modelSelect.value);
  });

  temperatureSlider.addEventListener('input', () => {
    temperatureValue.textContent = temperatureSlider.value;
    debouncedSave('temperature', parseFloat(temperatureSlider.value));
  });

  offersInput.addEventListener('input', () => {
    debouncedSave('offers', offersInput.value.trim());
  });

  guidelinesInput.addEventListener('input', () => {
    const value = guidelinesInput.value.trim() || DEFAULT_GUIDELINES;
    debouncedSave('guidelines', value);
  });

  setTimeout(() => {
    //advancedHint.classList.add('visible');
    setTimeout(() => {
    //  advancedHint.classList.remove('visible');
    }, 3000);
  }, 1000);
    // Track command/ctrl key state
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Meta' || e.key === 'Control') {
      isCommandPressed = true;
      saveButton.classList.add('command-active');
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Meta' || e.key === 'Control') {
      isCommandPressed = false;
      if (!isAdvancedMode) {
        saveButton.classList.remove('command-active');
      }
    }
  });

  // Handle save button click with command key
    // Prevent advanced section from closing if user is actively editing
  const advancedInputs = advancedSection.querySelectorAll('input, textarea');
  advancedInputs.forEach(input => {
    input.addEventListener('focus', () => {
      isAdvancedMode = true;
    });
  });


// Load saved credentials
chrome.storage.local.get(
  ['anthropicApiKey', 'wooCommerceKey', 'wooCommerceSecret', 'productSlugs', 'offers', 'guidelines', 'isAdvancedMode', 'modelName', 'temperature'],
  (result) => {
    if (result.anthropicApiKey) {
      apiKeyInput.value = result.anthropicApiKey;
    }
    if (result.wooCommerceKey) {
      wooKeyInput.value = result.wooCommerceKey;
    }
    if (result.wooCommerceSecret) {
      wooSecretInput.value = result.wooCommerceSecret; 
    }
    if (result.offers) {
      offersInput.value = result.offers;
    }
    if (result.guidelines) {
      guidelinesInput.value = result.guidelines;
    } else {
      guidelinesInput.value = DEFAULT_GUIDELINES;
    }
    if (result.modelName) {
      modelSelect.value = result.modelName;
    }
    if (result.temperature) {
      temperatureSlider.value = result.temperature;
      temperatureValue.textContent = result.temperature;
    }
    
    // Restore advanced mode if it was active
    if (result.isAdvancedMode) {
      isAdvancedMode = true;
      advancedToggle.classList.add('active');
      advancedSection.classList.add('visible');
    }
    
    updateButtonText(!!result.productSlugs);
  }
);
  
  

// Save credentials and refresh products
saveButton.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const wooKey = wooKeyInput.value.trim();
  const wooSecret = wooSecretInput.value.trim();
  const offers = offersInput.value.trim();
  const guidelines = guidelinesInput.value.trim() || DEFAULT_GUIDELINES;
  const modelName = modelSelect.value;
  const temperature = parseFloat(temperatureSlider.value);

  // Validate Anthropic API Key
  if (!apiKey) {
    showStatus('Please enter an Anthropic API key', 'error');
    shakeInput(apiKeyInput);
    return;
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    showStatus('Invalid Anthropic API key format', 'error');
    shakeInput(apiKeyInput);
    return;
  }

  // Validate WooCommerce credentials
  if (!wooKey || !wooSecret) {
    showStatus('Please enter WooCommerce credentials', 'error');
    if (!wooKey) shakeInput(wooKeyInput);
    if (!wooSecret) shakeInput(wooSecretInput);
    return;
  }

  // Basic length validation for WooCommerce credentials
  if (wooKey.length < 10 || wooSecret.length < 10) {
    showStatus('Invalid WooCommerce credentials format', 'error');
    shakeInput(wooKeyInput);
    shakeInput(wooSecretInput);
    return;
  }

  try {
    // Trigger AI effect first
    saveButton.classList.add('processing');
    updateProgress(10, 'Starting...');

    await aiEffect.activate(saveButton);
    
    updateProgress(20, 'Saving credentials...');

    // Save the credentials
    await chrome.storage.local.set({
      anthropicApiKey: apiKey,
      wooCommerceKey: wooKey,
      wooCommerceSecret: wooSecret,
      offers: offers,
      guidelines: guidelines,
      modelName: modelName,
      temperature: temperature
    });
    updateProgress(40, 'Testing connection...');

    try {
      const response = await testWooCommerceConnection(wooKey, wooSecret);
      
      if (response.success) {
        // Pass the updateProgress function to fetchAndStoreProducts
        await fetchAndStoreProducts(wooKey, wooSecret, updateProgress);
        
        // Short delay to show the completed progress bar
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Show appropriate success message based on mode
        if (isAdvancedMode) {
          showStatus('Advanced settings saved successfully!', 'success');
        } else {
          showStatus('Settings saved and products updated!', 'success');
        }
      } else {
        throw new Error(response.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      showStatus(`Connection Error: ${error.message}`, 'error');
    }
  } catch (error) {
    console.error('Settings save error:', error);
    showStatus('Error saving settings', 'error');
  } finally {
    
    // Reset button state after a short delay
    setTimeout(() => {
      saveButton.classList.remove('processing');
      updateProgress(0, '');
    }, 500);
  }
});

async function testWooCommerceConnection(wooKey, wooSecret) {
  const baseUrl = 'https://www.icenter-iraq.com/wp-json/wc/v3/products';
  const url = new URL(baseUrl);
  url.searchParams.append('consumer_key', wooKey);
  url.searchParams.append('consumer_secret', wooSecret);
  url.searchParams.append('per_page', '1');

  try {
    const response = await fetch(url.toString());
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (e) {
      throw new Error('Invalid JSON response from API');
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    return { success: false, error: error.message };
  }
}


async function fetchAndStoreProducts(wooKey, wooSecret, updateProgress) {
  const baseUrl = 'https://www.icenter-iraq.com/wp-json/wc/v3/products';
  const categoryIds = [ 20, 21, 22, 23, 24];
  const productMap = new Map();
  
  updateProgress(60, 'Fetching products...');
  
  // Calculate progress steps for categories
  const progressPerCategory = 10; // 10% progress per category (40% total)
  
  // Fetch all products from categories and store them in a Map to avoid duplicates
  for (let i = 0; i < categoryIds.length; i++) {
    const categoryId = categoryIds[i];
    try {
      const url = new URL(baseUrl);
      url.searchParams.append('consumer_key', wooKey);
      url.searchParams.append('consumer_secret', wooSecret);
      url.searchParams.append('category', categoryId);
      url.searchParams.append('per_page', '100');
      
      updateProgress(
        60 + (progressPerCategory * i), 
        `Fetching category ${i + 1}/${categoryIds.length}...`
      );
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const products = await response.json();

      // Add products to the Map using their ID to prevent duplicates
      products.forEach(product => {
        if (!productMap.has(product.id)) {
          productMap.set(product.id, product);
        }
      });
      
      // Update progress after each category
      updateProgress(
        60 + (progressPerCategory * (i + 1)), 
        `Fetched category ${i + 1}/${categoryIds.length}`
      );
      
    } catch (error) {
      console.error(`Error fetching category ${categoryId}:`, error);
      throw error;
    }
  }

  // Convert the Map to an array of products
  const allProducts = Array.from(productMap.values());

  // Exclude products with catalog_visibility set to 'hidden'
  const visibleProducts = allProducts.filter(product => product.catalog_visibility !== 'hidden');

  // Store slugs of visible products
  const allSlugs = visibleProducts.map(product => product.slug);
  await chrome.storage.local.set({ productSlugs: allSlugs });
  console.log('Stored product slugs:', allSlugs);

  // Initialize arrays for variations and out-of-production products
  const variations = [];
  const outOfProductionProducts = [];

  // Handle products that are hidden (out of production)
  const hiddenProducts = allProducts.filter(product => product.catalog_visibility === 'hidden');
  hiddenProducts.forEach(product => {
    outOfProductionProducts.push({
      slug: product.slug,
      status: 'out of production'
    });
  });

  // Fetch variations for variable products that are visible
  const variableProducts = visibleProducts.filter(p => p.type === 'variable');
  
  // Calculate progress steps for variations
  const totalVariableProducts = variableProducts.length;
  const progressPerVariation = totalVariableProducts > 0 ? 10 / totalVariableProducts : 0;
  
  updateProgress(90, 'Fetching product variations...');
  
  for (let i = 0; i < variableProducts.length; i++) {
    const product = variableProducts[i];

    try {
      updateProgress(
        90 + (progressPerVariation * i),
        `Fetching variations ${i + 1}/${totalVariableProducts}...`
      );
      
      const productVariations = await fetchProductVariations(wooKey, wooSecret, product.id);
      if (productVariations.length > 0) {
        variations.push({
          slug: product.slug,
          variations: productVariations
        });
      }
    } catch (error) {
      console.error(`Error fetching variations for product ${product.slug}:`, error);
    }
  }

  // Store the variations and out-of-production products
  updateProgress(98, 'Saving data...');
  await chrome.storage.local.set({ 
    productVariations: variations,
    outOfProductionProducts: outOfProductionProducts
  });
  
  console.log('Stored productVariations structure:', JSON.stringify(variations, null, 2));
  console.log('Number of products with variations:', variations.length);
  variations.forEach(product => {
    console.log(`Product ${product.slug}:`, {
      numberOfVariations: product.variations.length,
      variationExample: product.variations[0]
    });
  });
  
  console.log('Out of production products:', JSON.stringify(outOfProductionProducts, null, 2));
  
  updateProgress(100, 'Complete!');
  return { slugs: allSlugs, variations, outOfProductionProducts };
}

async function fetchProductVariations(wooKey, wooSecret, productId) {
  const baseUrl = `https://www.icenter-iraq.com/wp-json/wc/v3/products/${productId}/variations`;
  const url = new URL(baseUrl);
  url.searchParams.append('consumer_key', wooKey);
  url.searchParams.append('consumer_secret', wooSecret);
  url.searchParams.append('per_page', '100');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const variations = await response.json();
    const mappedVariations = variations.map(variation => ({
     // id: variation.id,
      name: variation.name || '',
      price: variation.price,
      stock_status: variation.stock_status
    }));

    console.log('Processed variations:', mappedVariations);
    return mappedVariations;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}



function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
  
  statusElement.style.opacity = '1';
  statusElement.style.transform = 'translateY(0)';
  
  if (type === 'success') {
    setTimeout(() => {
      statusElement.style.opacity = '0';
      statusElement.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        statusElement.className = 'status';
      }, 300);
    }, 3000);
  }
}
//ui
function updateProgress(percent, status = '') {
  const button = document.getElementById('saveSettings');
  const progressBar = button.querySelector('.progress-bar');
  const progressStatus = button.querySelector('.progress-status');
  const progressPercentage = button.querySelector('.progress-percentage');
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  
  if (progressStatus) {
    // Clear text if percent is 0
    progressStatus.textContent = percent === 0 ? '' : status;
  }
  
  if (progressPercentage) {
    // Clear percentage if percent is 0
    progressPercentage.textContent = percent === 0 ? '' : `${Math.round(percent)}%`;
  }
}

function updateButtonText(hasData) {
  const buttonText = document.querySelector('#saveSettings .button-text');
  if (buttonText) {
    if (isAdvancedMode) {
      buttonText.textContent = 'Save Advanced Settings';
    } else {
      buttonText.textContent = hasData ? 'Sync' : 'Start AI Assistant';
    }
  }
}



function shakeInput(element) {
  element.classList.add('shake');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake');
  }, { once: true });
}
})