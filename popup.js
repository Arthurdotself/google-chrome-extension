// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const wooKeyInput = document.getElementById('wooKey');
  const wooSecretInput = document.getElementById('wooSecret');
  
  // Load saved credentials
  chrome.storage.local.get(
    ['anthropicApiKey', 'wooCommerceKey', 'wooCommerceSecret'], 
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

    // Animate button
    saveButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      saveButton.style.transform = 'scale(1)';
    }, 100);

    try {
      // First, save the credentials
      await chrome.storage.local.set({
        anthropicApiKey: apiKey,
        wooCommerceKey: wooKey,
        wooCommerceSecret: wooSecret
      });

      // Then test the WooCommerce connection and fetch products
      try {
        showStatus('Testing connection...', 'status');

        const response = await testWooCommerceConnection(wooKey, wooSecret);
        console.log('Connection test response:', response);

        if (response.success) {
          await fetchAndStoreProducts(wooKey, wooSecret);
          showStatus('Settings saved and products updated!', 'success');
          console.log('WooCommerce test successful:', response.data);
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
    }
  });
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


async function fetchAndStoreProducts(wooKey, wooSecret) {
  const baseUrl = 'https://www.icenter-iraq.com/wp-json/wc/v3/products';
  const categoryIds = [21, 22, 23, 24];
  let allProducts = [];

  // First fetch all products from categories
  for (const categoryId of categoryIds) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.append('consumer_key', wooKey);
      url.searchParams.append('consumer_secret', wooSecret);
      url.searchParams.append('category', categoryId);
      url.searchParams.append('per_page', '100');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const products = await response.json();
      allProducts = [...allProducts, ...products];
    } catch (error) {
      console.error(`Error fetching category ${categoryId}:`, error);
      throw error;
    }
  }

  // Remove duplicates based on slug
  allProducts = Array.from(new Set(allProducts.map(p => p.slug)))
    .map(slug => allProducts.find(p => p.slug === slug));

  // Store slugs first
  const allSlugs = allProducts.map(product => product.slug);
  await chrome.storage.local.set({ productSlugs: allSlugs });
  console.log('Stored product slugs:', allSlugs);

  // Then fetch variations for variable products
  const variations = [];
  for (const product of allProducts) {
    if (product.type === 'variable') {
      try {
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
  }

  // Store the variations
  await chrome.storage.local.set({ productVariations: variations });
  console.log('Stored productVariations structure:', JSON.stringify(variations, null, 2));
  console.log('Number of products with variations:', variations.length);
  variations.forEach(product => {
    console.log(`Product ${product.slug}:`, {
      numberOfVariations: product.variations.length,
      variationExample: product.variations[0]
    });
  });
    
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

function shakeInput(element) {
  element.classList.add('shake');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake');
  }, { once: true });
}