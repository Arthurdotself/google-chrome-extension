// woocommerceService.js
class WooCommerceService {
    constructor() {
        this.baseUrl = 'https://www.icenter-iraq.com/wp-json/wc/v3';
    }

    normalizeString(str) {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async searchProducts(searchTerm, consumerKey, consumerSecret) {
        try {
            // Create authentication string
            const auth = btoa(`${consumerKey}:${consumerSecret}`);
            
            // Build search URL with proper encoding
            const searchUrl = `${this.baseUrl}/products?search=${encodeURIComponent(searchTerm)}`;
            
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`WooCommerce API error: ${response.status}`);
            }

            const products = await response.json();
            
            // Process and return relevant product data
            return products.map(product => ({
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                regular_price: product.regular_price,
                sale_price: product.sale_price,
                status: product.status,
                permalink: product.permalink,
                short_description: product.short_description,
                stock_status: product.stock_status,
                variations: product.variations || []
            }));

        } catch (error) {
            console.error('Error in searchProducts:', error);
            throw error;
        }
    }

    async getProductVariations(productId, consumerKey, consumerSecret) {
        try {
            const auth = btoa(`${consumerKey}:${consumerSecret}`);
            const response = await fetch(`${this.baseUrl}/products/${productId}/variations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch variations: ${response.status}`);
            }

            const variations = await response.json();
            return variations.map(variation => ({
                id: variation.id,
                name: variation.name || '',
                price: variation.price,
                stock_status: variation.stock_status
            }));
        } catch (error) {
            console.error('Error fetching variations:', error);
            return [];
        }
    }
}

export default new WooCommerceService();