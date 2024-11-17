// popup.js
// AIEffect class definition
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
  const saveButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const wooKeyInput = document.getElementById('wooKey');
  const wooSecretInput = document.getElementById('wooSecret');
  
  // Initialize AI Effect
  const aiEffect = new AIEffect();
  
  // Load saved credentials
  chrome.storage.local.get(
    ['anthropicApiKey', 'wooCommerceKey', 'wooCommerceSecret', 'productSlugs'], // Added 'productSlugs'
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
      updateButtonText(!!result.productSlugs);
    }
  );

  // Save credentials and refresh products
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const wooKey = wooKeyInput.value.trim();
    const wooSecret = wooSecretInput.value.trim();
    
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
        wooCommerceSecret: wooSecret
      });
      updateProgress(40, 'Testing connection...');
  
      try {
        const response = await testWooCommerceConnection(wooKey, wooSecret);
        
        if (response.success) {
          // Pass the updateProgress function to fetchAndStoreProducts
          await fetchAndStoreProducts(wooKey, wooSecret, updateProgress);
          
          // Short delay to show the completed progress bar
          await new Promise(resolve => setTimeout(resolve, 200));
          
          showStatus('Settings saved and products updated!', 'success');
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
  const categoryIds = [21, 22, 23, 24];
  let allProducts = [];
  
  updateProgress(60, 'Fetching products...');
  
  // Calculate progress steps for categories
  const progressPerCategory = 10; // 10% progress per category (40% total)
  
  // First fetch all products from categories
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
      allProducts = [...allProducts, ...products];
      
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

  // Remove duplicates based on slug
  updateProgress(85, 'Processing products...');
  allProducts = Array.from(new Set(allProducts.map(p => p.slug)))
    .map(slug => allProducts.find(p => p.slug === slug));

  // Store slugs first
  const allSlugs = allProducts.map(product => product.slug);
  await chrome.storage.local.set({ productSlugs: allSlugs });
  console.log('Stored product slugs:', allSlugs);

  // Then fetch variations for variable products
  const variations = [];
  const variableProducts = allProducts.filter(p => p.type === 'variable');
  
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

  // Store the variations
  updateProgress(98, 'Saving data...');
  await chrome.storage.local.set({ productVariations: variations });
  
  console.log('Stored productVariations structure:', JSON.stringify(variations, null, 2));
  console.log('Number of products with variations:', variations.length);
  variations.forEach(product => {
    console.log(`Product ${product.slug}:`, {
      numberOfVariations: product.variations.length,
      variationExample: product.variations[0]
    });
  });
  
  updateProgress(100, 'Complete!');
  return { slugs: allSlugs, variations };
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
  const buttonContent = document.querySelector('#saveSettings .button-content');
  if (buttonContent) {
    buttonContent.innerHTML = `
      <svg class="save-icon" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      ${hasData ? 'Sync' : 'Start AI Assistant'}
    `;
  }
}
function shakeInput(element) {
  element.classList.add('shake');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake');
  }, { once: true });
}
}
)