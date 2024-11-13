// getWoocomerceProd.js
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const NodeCache = require("node-cache");
const stringSimilarity = require('string-similarity');

// Initialize WooCommerce API
const api = new WooCommerceRestApi({
    url: process.env.WOOCOMMERCE_URL || "https://www.icenter-iraq.com/sandbox",
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3"
});

// Initialize cache with 1-hour TTL
const productsCache = new NodeCache({ stdTTL: 3600 });

class WooProductsService {
    constructor() {
        this.api = api;
        this.cache = productsCache;
    }

    // Helper method to normalize strings for comparison
    normalizeString(str) {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Convert product slugs text to array
    convertSlugsToArray(slugsText) {
        if (!slugsText) return [];
        
        return slugsText
            .split('\n')
            .map(line => {
                // Remove trailing/leading slashes and whitespace
                let slug = line.trim().replace(/^\/|\/$/g, '');
                // Remove any domain if present
                slug = slug.replace(/^https?:\/\/[^\/]+\//, '');
                return slug;
            })
            .filter(slug => slug.length > 0); // Remove empty lines
    }

    // Get all products with caching
    async getAllProducts(forceRefresh = false) {
        const CACHE_KEY = 'all_products';
        
        if (!forceRefresh && this.cache.has(CACHE_KEY)) {
            return this.cache.get(CACHE_KEY);
        }

        try {
            const response = await this.api.get("products", {
                status: "publish",
                per_page: 100
            });

            const products = response.data;
            this.cache.set(CACHE_KEY, products);
            return products;
        } catch (error) {
            console.error("Error fetching all products:", error.message);
            return this.cache.has(CACHE_KEY) ? this.cache.get(CACHE_KEY) : [];
        }
    }

    // Get single product by slug with caching
    async getProductBySlug(slug) {
        const CACHE_KEY = `product_${slug}`;

        if (this.cache.has(CACHE_KEY)) {
            return this.cache.get(CACHE_KEY);
        }

        try {
            const response = await this.api.get("products", {
                slug: slug,
                status: "publish",
                per_page: 1
            });

            if (response.data.length > 0) {
                const product = response.data[0];
                this.cache.set(CACHE_KEY, product);
                return product;
            }
            return null;
        } catch (error) {
            console.error("Error fetching product by slug:", error.message);
            return null;
        }
    }

    // Get product variations
    async getProductVariations(productId) {
        const CACHE_KEY = `variations_${productId}`;

        if (this.cache.has(CACHE_KEY)) {
            return this.cache.get(CACHE_KEY);
        }

        try {
            const response = await this.api.get(`products/${productId}/variations`);
            const variations = response.data;
            this.cache.set(CACHE_KEY, variations);
            return variations;
        } catch (error) {
            console.error("Error fetching product variations:", error.message);
            return [];
        }
    }

    // Find best matching product using fuzzy search
    async findBestMatchingProduct(searchTerm, slugsText) {
        try {
            // Convert slugs text to array and normalize search term
            const slugsArray = this.convertSlugsToArray(slugsText);
            const normalizedSearchTerm = this.normalizeString(searchTerm);
            
            // Map slugs to normalized versions for comparison
            const productMatches = slugsArray.map(slug => ({
                original: slug,
                normalized: this.normalizeString(slug)
            }));

            // Find best match using string similarity
            const matches = stringSimilarity.findBestMatch(
                normalizedSearchTerm,
                productMatches.map(p => p.normalized)
            );

            // If good match found (adjust threshold as needed)
            if (matches.bestMatch.rating > 0.4) {
                return productMatches[matches.bestMatchIndex].original;
            }

            // Try partial matching if no good similarity match
            const partialMatches = productMatches.filter(product => 
                product.normalized.includes(normalizedSearchTerm) || 
                normalizedSearchTerm.includes(product.normalized)
            );

            if (partialMatches.length > 0) {
                partialMatches.sort((a, b) => 
                    Math.abs(a.normalized.length - normalizedSearchTerm.length) -
                    Math.abs(b.normalized.length - normalizedSearchTerm.length)
                );
                return partialMatches[0].original;
            }

            return null;
        } catch (error) {
            console.error("Error in findBestMatchingProduct:", error);
            return null;
        }
    }

    // Enhanced product search with fuzzy matching
    async enhancedProductSearch(searchTerm, slugsText) {
        try {
            console.log('Search term:', searchTerm);
            console.log('Slugs text sample:', slugsText.substring(0, 100) + '...');

            // Try exact match first
            let product = await this.getProductBySlug(searchTerm);
            let result = null;

            if (product) {
                result = {
                    product: this.formatProductDetails(product),
                    variations: []
                };

                if (product.variations && product.variations.length > 0) {
                    const variations = await this.getProductVariations(product.id);
                    result.variations = variations.map(v => this.formatVariationDetails(v));
                }
            } else {
                // Try fuzzy matching if exact match fails
                const bestMatch = await this.findBestMatchingProduct(searchTerm, slugsText);
                if (bestMatch) {
                    product = await this.getProductBySlug(bestMatch);
                    if (product) {
                        result = {
                            product: this.formatProductDetails(product),
                            variations: [],
                            fuzzyMatch: true,
                            originalSearch: searchTerm,
                            matchedTerm: bestMatch
                        };

                        if (product.variations && product.variations.length > 0) {
                            const variations = await this.getProductVariations(product.id);
                            result.variations = variations.map(v => this.formatVariationDetails(v));
                        }
                    }
                }
            }

            return result;
        } catch (error) {
            console.error("Error in enhancedProductSearch:", error);
            return null;
        }
    }

    // Format product details for consistency
    formatProductDetails(product) {
        return {
            id: product.id,
            name: product.name,
            price: product.price,
            stock_status: product.stock_status,
            permalink: product.permalink,
            slug: product.slug
        };
    }

    // Format variation details
    formatVariationDetails(variation) {
        return {
            id: variation.id,
            name: variation.name || '',
            price: variation.price,
            stock_status: variation.stock_status
        };
    }

    // Cache management methods
    clearProductCache(slug) {
        const productKey = `product_${slug}`;
        this.cache.del(productKey);
    }

    clearAllCache() {
        this.cache.flushAll();
    }

    handleProductUpdate(productData) {
        this.clearProductCache(productData.slug);
        this.cache.del('all_products');
    }
}

module.exports = new WooProductsService();