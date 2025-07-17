/**
 * Google Places API Client
 * Handles all interactions with Google Places and Geocoding APIs
 */

class GooglePlacesAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        /** withflask
        this.baseUrl = 'http://localhost:5000/geocode';
        this.geocodingUrl = 'http://localhost:5000/places'; */
        //without flask
        this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
        this.geocodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        
        // Track API usage for cost monitoring
        this.requestCount = {
            search: 0,
            details: 0,
            geocoding: 0
        };
        
        console.log('Google Places API client initialized');
    }

    /**
     * Check if a string looks like a US zip code
     * @param {string} location - Location string to check
     * @returns {boolean} True if it looks like a zip code
     */
    isZipCode(location) {
        return CONFIG.VALIDATION.ZIP_CODE_PATTERN.test(location.trim());
    }

    /**
     * Convert zip code to latitude/longitude coordinates
     * @param {string} zipCode - US zip code (e.g., "27601" or "27601-1234")
     * @returns {Promise<Object>} Coordinates object {lat, lng} or error
     */
    async geocodeZipCode(zipCode) {
        console.log('Geocoding zip code:', zipCode);
        
        const params = new URLSearchParams({
            address: zipCode + ', USA', // Add USA to ensure US zip codes
            key: this.apiKey
        });

        try {
            this.requestCount.geocoding++;
            
           /** const response = await fetch(`${this.geocodingUrl}?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
                });    
                */

            const response = await fetch(`${this.geocodingUrl}?${params}`, {
            method: 'GET'
             // No headers needed for GET requests
            });
            

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status !== 'OK') {
                throw new Error(`Geocoding API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }

            if (!data.results || data.results.length === 0) {
                throw new Error(`No location found for zip code: ${zipCode}`);
            }

            const location = data.results[0].geometry.location;
            const result = {
                success: true,
                coordinates: {
                    lat: location.lat,
                    lng: location.lng
                },
                formatted_address: data.results[0].formatted_address,
                error: null
            };
            
            console.log('Geocoding successful:', result.coordinates);
            return result;
            
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                success: false,
                coordinates: null,
                formatted_address: null,
                error: error.message
            };
        }
    }

    /**
     * Convert location string to coordinates (handles both addresses and zip codes)
     * @param {string} location - Location string (address or zip code)
     * @returns {Promise<string>} Location string suitable for Places API
     */
    async processLocation(location) {
        const cleanLocation = location.trim();
        
        // If it's a zip code, convert to coordinates
        if (this.isZipCode(cleanLocation)) {
            const geocodeResult = await this.geocodeZipCode(cleanLocation);
            if (geocodeResult.success) {
                return `${geocodeResult.coordinates.lat},${geocodeResult.coordinates.lng}`;
            } else {
                throw new Error(`Could not find coordinates for zip code ${cleanLocation}: ${geocodeResult.error}`);
            }
        }
        
        // If it's already coordinates (lat,lng format), return as-is
        if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(cleanLocation)) {
            return cleanLocation;
        }
        
        // Otherwise, assume it's an address and return as-is for Places API
        return cleanLocation;
    }

    /**
     * Search for restaurants using Google Places Text Search API
     * @param {string} query - Search query (e.g., "Italian restaurants")
     * @param {string} location - Location (address, zip code, or lat,lng)
     * @param {number} radius - Search radius in meters
     * @returns {Promise<Object>} Search results with success/error status
     */
    async searchRestaurants(query, location, radius) {
        console.log('Searching restaurants:', { query, location, radius });
        
        try {
            // Process the location (convert zip code if needed)
            const processedLocation = await this.processLocation(location);
            
            const params = new URLSearchParams({
                query: `${query} restaurant`, // Always add "restaurant" to improve results
                location: processedLocation,
                radius: radius.toString(),
                type: 'restaurant',
                key: this.apiKey
            });

            this.requestCount.search++;
            console.log(`API Cost Tracker - Search calls: ${this.requestCount.search} (~$${(this.requestCount.search * 0.032).toFixed(3)})`);
            
            const response = await fetch(`${this.baseUrl}/textsearch/json?${params}`, {
              method: 'GET'
              // No headers needed for GET requests
            });
           /** const response = await fetch(`${this.baseUrl}/textsearch/json?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }); */

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status !== 'OK') {
                // Handle different API error statuses
                let errorMessage = `API Error: ${data.status}`;
                
                switch (data.status) {
                    case 'ZERO_RESULTS':
                        errorMessage = 'No restaurants found in this area. Try expanding your search radius or changing your query.';
                        break;
                    case 'OVER_QUERY_LIMIT':
                        errorMessage = 'API quota exceeded. Please try again later or check your billing settings.';
                        break;
                    case 'REQUEST_DENIED':
                        errorMessage = 'API request denied. Please check your API key and make sure Places API is enabled.';
                        break;
                    case 'INVALID_REQUEST':
                        errorMessage = 'Invalid search parameters. Please check your query and location.';
                        break;
                    default:
                        errorMessage += data.error_message ? ` - ${data.error_message}` : '';
                }
                
                throw new Error(errorMessage);
            }

            const results = data.results || [];
            console.log(`Found ${results.length} restaurants`);
            
            return {
                success: true,
                data: results,
                total_results: results.length,
                next_page_token: data.next_page_token || null,
                error: null
            };

        } catch (error) {
            console.error('Restaurant search error:', error);
            return {
                success: false,
                data: [],
                total_results: 0,
                next_page_token: null,
                error: error.message
            };
        }
    }

    /**
     * Get detailed information about a specific restaurant
     * @param {string} placeId - Google Place ID
     * @returns {Promise<Object|null>} Detailed place information or null if error
     */
    async getPlaceDetails(placeId) {
        console.log('Getting place details for:', placeId);
        
        const fields = [
            'name',
            'rating', 
            'user_ratings_total',
            'price_level',
            'business_status',
            'formatted_address',
            'geometry',
            'types',
            'opening_hours',
            'website',
            'formatted_phone_number',
            'reviews' // Get recent reviews for sentiment analysis
        ].join(',');

        const params = new URLSearchParams({
            place_id: placeId,
            fields: fields,
            key: this.apiKey
        });

        try {
            this.requestCount.details++;
            console.log(`API Cost Tracker - Details calls: ${this.requestCount.details} (~$${(this.requestCount.details * 0.017).toFixed(3)})`);
            const response = await fetch(`${this.baseUrl}/details/json?${params}`, {
            method: 'GET'
            // No headers needed for GET requests
            });
            /** 
            const response = await fetch(`${this.baseUrl}/details/json?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }); */

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'OK') {
                console.log('Place details retrieved successfully');
                return data.result;
            } else {
                throw new Error(`Details API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('Place details error:', error);
            return null;
        }
    }

    /**
     * Get multiple place details efficiently (batch processing)
     * @param {Array<string>} placeIds - Array of Google Place IDs
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Array>} Array of detailed place information
     */
    async getMultiplePlaceDetails(placeIds, progressCallback = null) {
        console.log(`Getting details for ${placeIds.length} places...`);
        
        const results = [];
        const delay = 100; // 100ms delay between requests to avoid rate limiting
        
        for (let i = 0; i < placeIds.length; i++) {
            const placeId = placeIds[i];
            
            try {
                const details = await this.getPlaceDetails(placeId);
                if (details) {
                    results.push(details);
                }
                
                // Update progress
                if (progressCallback) {
                    progressCallback(i + 1, placeIds.length);
                }
                
                // Add delay to avoid hitting rate limits
                if (i < placeIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.warn(`Failed to get details for place ${placeId}:`, error);
            }
        }
        
        console.log(`Retrieved details for ${results.length}/${placeIds.length} places`);
        return results;
    }

    /**
     * Get current API usage statistics
     * @returns {Object} Usage statistics and cost estimates
     */
    getUsageStats() {
        const searchCost = this.requestCount.search * 0.032;
        const detailsCost = this.requestCount.details * 0.017;
        const geocodingCost = this.requestCount.geocoding * 0.005;
        const totalCost = searchCost + detailsCost + geocodingCost;
        
        return {
            requests: { ...this.requestCount },
            estimatedCost: {
                search: searchCost,
                details: detailsCost,
                geocoding: geocodingCost,
                total: totalCost
            },
            totalRequests: this.requestCount.search + this.requestCount.details + this.requestCount.geocoding
        };
    }

    /**
     * Reset usage statistics
     */
    resetUsageStats() {
        this.requestCount = { search: 0, details: 0, geocoding: 0 };
        console.log('Usage statistics reset');
    }

    /**
     * Validate API key format (basic check)
     * @param {string} apiKey - API key to validate
     * @returns {boolean} True if format looks valid
     */
    static validateApiKeyFormat(apiKey) {
        // Google API keys are typically 39 characters and start with "AIza"
        return typeof apiKey === 'string' && 
               apiKey.length >= 35 && 
               apiKey.startsWith('AIza');
    }

    /**
     * Test API key by making a simple request
     * @param {string} apiKey - API key to test
     * @returns {Promise<Object>} Test result with success status
     */
    static async testApiKey(apiKey) {
        console.log('Testing API key...');
        
        if (!GooglePlacesAPI.validateApiKeyFormat(apiKey)) {
            return {
                success: false,
                error: 'Invalid API key format. Google API keys should start with "AIza" and be about 39 characters long.'
            };
        }
        
        try {
            // Make a simple geocoding request to test the key
            const testParams = new URLSearchParams({
                address: 'New York, NY',
                key: apiKey
            });
            
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${testParams}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                console.log('API key is valid');
                return { success: true, error: null };
            } else {
                console.log('API key test failed:', data.status);
                return { 
                    success: false, 
                    error: `API key test failed: ${data.status} - ${data.error_message || 'Please check your API key and billing settings'}` 
                };
            }
            
        } catch (error) {
            console.error('API key test error:', error);
            return {
                success: false,
                error: `Network error during API key test: ${error.message}`
            };
        }
    }
}

// Make GooglePlacesAPI available globally
if (typeof window !== 'undefined') {
    window.GooglePlacesAPI = GooglePlacesAPI;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GooglePlacesAPI;
}

console.log('Google Places API client loaded successfully');
